const express = require("express");
const router = express.Router();

const {
  checkEligibility,
  createLoan,
  viewLoanById,
  makePayment,
  viewLoanStatement,
} = require("../controllers/loanController");

router.route("/check-eligibility").get(checkEligibility);
router.route("/create-loan").post(createLoan);
router.route("/view-loan/:loan_id").get(viewLoanById);
router.route("/make-payment/:customer_id/:loan_id").post(makePayment);
router.route("/view-statement/:customer_id/:loan_id").get(viewLoanStatement);

module.exports = router;
