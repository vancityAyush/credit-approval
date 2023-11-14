const calculateCreditScore = (user) => {
  let creditScore = 0;

  user.loans.forEach((loan) => {
    // Past Loans paid on time
    const hasPaidOnTime = loan.emis_paid_on_time <= loan.tenure;
    if (hasPaidOnTime) {
      creditScore += 10;
    } else {
      creditScore -= 10;
    }

    // Loan activity in the current year
    const currentYear = new Date().getFullYear();
    const loanYear = new Date(loan.start_date).getFullYear();
    if (loanYear === currentYear) {
      creditScore -= 5;
    }
  });

  // Loan approved volume
  const approvedLoanVolume = user.loans.reduce(
    (total, loan) => total + loan.loan_amount,
    0
  );
  if (approvedLoanVolume > user.approved_limit) {
    creditScore = 0;
  }

  console.log(`credit score: ${creditScore}`);
  return Math.max(0, Math.min(100, creditScore));
};

module.exports = calculateCreditScore;
