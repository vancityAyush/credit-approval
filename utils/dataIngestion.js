const xlsx = require("xlsx");
const prisma = require("../prisma/prismaClient");

// Function to convert date string to Date object
function convertToDate(excelDate) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const date = new Date(Date.UTC(1899, 11, 30)); // Excel's epoch is on December 30, 1899
  date.setTime(date.getTime() + excelDate * MS_PER_DAY);
  return date;
}

async function dataIngestion() {
  // Read Customer data from Excel
  const customerWorkbook = xlsx.readFile("./utils/customer_data.xlsx");
  const customerData = xlsx.utils.sheet_to_json(
    customerWorkbook.Sheets[customerWorkbook.SheetNames[0]]
  );

  for (const customer of customerData) {
    try {
      await prisma.user.create({
        data: {
          customer_id: customer.customer_id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          age: customer.age,
          phone_number: customer.phone_number,
          monthly_salary: customer.monthly_salary,
          approved_limit: customer.approved_limit,
          current_debt: 0,
        },
      });
      console.info(`added record with customer_id: ${customer.customer_id}`);
    } catch {
      console.error(`Can't add user with customer_id: ${customer.customer_id}`);
    }
  }

  // Read Loan data from Excel
  const loanWorkbook = xlsx.readFile("./utils/loan_data.xlsx");
  const loanData = xlsx.utils.sheet_to_json(
    loanWorkbook.Sheets[loanWorkbook.SheetNames[0]]
  );

  // Calculate and update current_debt for each user based on ongoing loans
  for (const loan of loanData) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: {
          customer_id: loan.customer_id,
        },
        include: {
          loans: {
            where: {
              end_date: {
                gte: new Date(), // Assuming 'end_date' is the date when a loan ends
              },
            },
            select: {
              loan_amount: true,
            },
          },
        },
      });

      if (existingUser) {
        const ongoingLoans = existingUser.loans;
        const totalLoanAmount = ongoingLoans.reduce(
          (total, loan) => total + loan.loan_amount,
          0
        );

        await prisma.user.update({
          where: {
            customer_id: loan.customer_id,
          },
          data: {
            current_debt: totalLoanAmount,
          },
        });

        // Add a new loan without checking for duplicates
        await prisma.loan.create({
          data: {
            customer_id: loan.customer_id,
            loan_id: loan.loan_id,
            loan_amount: loan.loan_amount,
            tenure: loan.tenure,
            interest_rate: loan.interest_rate,
            monthly_repayment: loan.monthly_payment,
            emis_paid_on_time: loan.emis_paid_on_time,
            start_date: convertToDate(loan.start_date),
            end_date: convertToDate(loan.end_date),
          },
        });
        console.log(`added record with loan_id: ${loan.loan_id}`);
      }
    } catch {
      console.error(`Can't add loan with loan_id: ${loan.loan_id}`);
    }
  }
}

module.exports = dataIngestion;
