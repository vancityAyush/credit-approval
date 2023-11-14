const BigPromise = require("../middlewares/bigPromise");
const prisma = require("../prisma/prismaClient");
const calculateCreditScore = require("../utils/calculateCreditScore");
const CustomError = require("../utils/customErrors");

const checkEligibility = BigPromise(async (req, res, next) => {
  try {
    const { customer_id, loan_amount, interest_rate, tenure } = req.body;

    // Check if all fields are given in body or not
    if (!customer_id || !loan_amount || !interest_rate || !tenure) {
      return next(new CustomError("All fields are required", 400));
    }

    // Fetch user and related loan data from the database
    const user = await prisma.user.findUnique({
      where: { customer_id },
      include: { loans: true },
    });

    // User is not found in the database
    if (!user) {
      return next(new CustomError("User not found", 400));
    }

    // Calculate credit score
    let creditScore = calculateCreditScore(user);
    let approval = false;
    let correctedInterestRate = interest_rate;

    // If credit score > 50, approve loan
    if (creditScore >= 50) {
      approval = true;
    }
    // If 50 > credit score > 30, approve loans with interest rate> 12%
    else if (50 > creditScore && creditScore >= 30) {
      correctedInterestRate = Math.max(12, interest_rate);
      approval = interest_rate > 12;
    }
    // If 30> credit score > 10, approve loans with interest rate>16%
    else if (30 > creditScore && creditScore >= 10) {
      correctedInterestRate = Math.max(12, interest_rate);
      approval = interest_rate > 16;
    }
    // If 10> credit score, don’t approve any loans
    else if (10 > creditScore) {
      approval = false;
    }

    // If sum of all current EMIs > 50% of monthly salary,don’t approve any loans
    const monthly_salary = user.monthly_salary;
    const currentEMI = user.loans.reduce((total, loan) => {
      const currentDate = new Date();
      if (loan.end_date > currentDate) {
        return total + loan.monthly_repayment;
      }
      return total;
    }, 0);

    if (currentEMI > 0.5 * monthly_salary) {
      approval = false;
    }

    // Assuming tenure is provided in months, interest_rate is an annual rate
    const monthlyRate = correctedInterestRate / (12 * 100);
    const compoundFactor = Math.pow(1 + monthlyRate, tenure);
    const monthlyInstallment =
      (loan_amount * compoundFactor * monthlyRate) / (compoundFactor - 1);

    // Response object
    const response = {
      customer_id,
      approval,
      interest_rate,
      corrected_interest_rate: correctedInterestRate,
      tenure,
      monthly_installment: monthlyInstallment,
    };

    // Send the response
    if (!res) {
      return response;
    }
    res.status(200).json(response);
  } catch (error) {
    console.error("Error:", error);
    if (!res) {
      return {};
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

const createLoan = BigPromise(async (req, res, next) => {
  try {
    const { customer_id, loan_amount, interest_rate, tenure } = req.body;

    if (!customer_id || !loan_amount || !interest_rate || !tenure) {
      return next(new CustomError("All fields are required", 400));
    }

    // Fetch user and related loan data from the database
    const user = await prisma.user.findUnique({
      where: { customer_id },
    });

    // User is not found in the database
    if (!user) {
      return next(new CustomError("User not found", 400));
    }

    const checkEligibilityResponse = await checkEligibility({ body: req.body });

    let loanId = null;
    let loan_approved = false;
    let message = "";
    let monthly_installment = 0;
    let response = {};

    if (checkEligibilityResponse.approval) {
      // Save the new loan details in the database
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + tenure);

      const newLoan = await prisma.loan.create({
        data: {
          customer_id,
          loan_amount,
          interest_rate: checkEligibilityResponse.corrected_interest_rate,
          tenure,
          monthly_repayment: checkEligibilityResponse.monthly_installment,
          emis_paid_on_time: 0,
          amount_with_interest:
            checkEligibilityResponse.monthly_installment * tenure,
          start_date: new Date(),
          end_date: end,
        },
      });

      loanId = newLoan.loan_id;
      loan_approved = true;
      message = "Loan approved";
      monthly_installment = checkEligibilityResponse.monthly_installment;

      response = {
        loan_id: loanId,
        customer_id,
        loan_approved,
        message,
        monthly_installment,
      };
      res.status(201).json(response);
    } else {
      message = "Loan not approved due to low credit score or high EMIs";

      response = {
        customer_id,
        loan_approved,
        message,
      };
      res.status(200).json(response);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const viewLoanById = BigPromise(async (req, res, next) => {
  try {
    const loanId = req.params.loan_id;

    // Fetch the loan details including the associated user information
    const loan = await prisma.loan.findUnique({
      where: { loan_id: parseInt(loanId) },
      include: {
        user: {
          select: {
            customer_id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            age: true,
          },
        },
      },
    });

    if (!loan) {
      return next(new CustomError("Loan not found", 404));
    }

    const loanDetails = {
      loan_id: loan.loan_id,
      customer: {
        ...loan.user,
        phone_number: loan.user.phone_number.toString(),
      },
      loan_amount: loan.loan_amount,
      interest_rate: loan.interest_rate,
      monthly_installment: loan.monthly_repayment,
      tenure: loan.tenure,
    };

    res.status(200).json(loanDetails);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const makePayment = BigPromise(async (req, res, next) => {
  try {
    const { customer_id, loan_id } = req.params;
    const { paid_amount } = req.body;

    // Fetch the loan details and include user information
    const loan = await prisma.loan.findUnique({
      where: { loan_id: parseInt(loan_id) },
      include: {
        user: true,
      },
    });

    if (!loan || loan.customer_id !== parseInt(customer_id)) {
      return next(new CustomError("Loan not found for this customer", 404));
    }

    // Calculate the total paid amount so far and the remaining amount
    let totalAmountPaid = loan.total_amount_paid + paid_amount;
    const remainingAmount = loan.amount_with_interest - totalAmountPaid;

    const recalculatedEMI =
      remainingAmount / (loan.tenure - (loan.emis_paid_on_time + 1));

    // Update the loan information with the recalculated EMI and total amount paid
    const updatedLoan = await prisma.loan.update({
      where: { loan_id: parseInt(loan_id) },
      data: {
        monthly_repayment: recalculatedEMI,
        emis_paid_on_time: {
          increment: 1,
        },
        total_amount_paid: totalAmountPaid,
      },
    });

    res.status(200).json({
      message: "Payment processed successfully",
      recalculated_installment: recalculatedEMI,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const viewLoanStatement = BigPromise(async (req, res, next) => {
  try {
    const { customer_id, loan_id } = req.params;

    const loan = await prisma.loan.findFirst({
      where: {
        AND: [
          { loan_id: parseInt(loan_id) },
          { customer_id: parseInt(customer_id) },
        ],
      },
    });

    if (!loan) {
      return next(new CustomError("Loan not found for this customer", 404));
    }

    // Finding number of repayments left
    const repaymentsLeft = loan.tenure - loan.emis_paid_on_time;

    // Prepare the response data
    const loanItem = {
      customer_id: loan.customer_id,
      loan_id: loan.loan_id,
      principal: loan.loan_amount,
      interest_rate: loan.interest_rate,
      amount_paid: loan.total_amount_paid,
      monthly_installment: loan.monthly_repayment,
      repayments_left: repaymentsLeft,
    };

    res.status(200).json(loanItem);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = {
  checkEligibility,
  createLoan,
  viewLoanById,
  makePayment,
  viewLoanStatement,
};
