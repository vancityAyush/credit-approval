
# Loan taking backend - Alemeno

This project is an assignment given by alemeno in which I have created some APIs using node, express, and prisma(SQL in backend).



## Tech Stack

**Server:** Node, Express

**Backend:** MYSQL(using Prisma)

**Tools:** Docker, Git




## Deployment - Using Docker

Clone the project
```sh
   git clone https://github.com/rishabhguptaxdev/alemeno-backend-assignment.git
```

Change to directory
```sh
   cd alemeno-backend-assignment
```

Rename .env.sample file to .env
```sh
   mv .env.sample .env
```

Build the image and run it

- It will create two containers

- One for MYSQL Database and other for Application

- Initial DB migrations will happen from two excel files then Application will be started.

```sh
   docker-compose up --build
```


## Running Tests

To run Server is started or not, try to access home route.

#### Home Route

```http
  GET /
```

### 🔗 Test using Postman 
[Postman Collection](https://documenter.getpostman.com/view/15822838/2s9YXfcPHd)
