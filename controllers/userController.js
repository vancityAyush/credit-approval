const BigPromise = require("../middlewares/bigPromise");
const prisma = require("../prisma/prismaClient");
const CustomError = require("../utils/customErrors");

exports.register = BigPromise(async (req, res, next) => {
  const { first_name, last_name, age, phone_number, monthly_salary } = req.body;

  if (!first_name || !last_name || !age || !phone_number || !monthly_salary) {
    return next(new CustomError("All feilds are required", 400));
  }

  const approved_limit = Math.max(
    100000,
    Math.round((36 * monthly_salary) / 100000) * 100000
  );

  const user = await prisma.user.create({
    data: {
      first_name,
      last_name,
      age,
      phone_number,
      monthly_salary,
      approved_limit,
    },
  });

  const responseUser = {
    customer_id: user.customer_id,
    name: user.first_name + " " + user.last_name,
    age: user.age,
    monthly_income: user.monthly_salary,
    approved_limit,
    phone_number: user.phone_number.toString(),
  };

  res.status(201).json({
    success: true,
    responseUser,
  });
});
