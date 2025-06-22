# DEEL FULLSTACK TASK

💫 Welcome! 🎉

This full-stack exercise involves building a Node.js/Express.js app that will serve a REST API, as well as a React App that will use data from the API.

There is no strict time limit to complete this task, but we expect that you will need to spend between 3-5 hours to meet the requirements. Make sure to submit your test only when you are confident that it meets all the requirements and you are satisfied with the quality of the project.

## Important Note
**DO NOT** spend much time on your front-end build setup. Use a skeleton repo that you're comfortable with. If you set up a complete front-end from scratch you will burn far too much time that we'd rather have you spend on developing the features required in this task.

## Data Models

> **All models are defined in `src/model.js`**

### Profile

A profile can be either a `client` or a `contractor`.  
Clients create contracts with contractors, while contractors perform jobs for clients and get paid.  
Each profile has a balance property.

### Contract

A contract exists between a client and a contractor.  
Contracts have 3 statuses: `new`, `in_progress`, and `terminated`.  
Contracts are considered active only when in the `in_progress` status.  
Contracts group jobs within them.

### Job

Contractors get paid for jobs performed under a certain contract by clients.

## Getting Set Up

The exercise requires [React](https://reactjs.org/) and [Node.js](https://nodejs.org/en/) to be installed. We recommend using the LTS version of Node and React 18 or later. For bootstrapping your React app, feel free to use CRA, a Vite template, or a solution of your own devising. **You will be creating the front-end from scratch, but use a skeleton project to set up your build, etc.**

1. Start by creating a local repository for this folder.
2. Set up your front-end project in the way that makes the most sense to you, using a template/skeleton project.
3. In the repo's root directory, run `npm install` to install all dependencies.
4. Next, run `npm run seed` to seed the local SQLite database. **Warning: This will drop the database if it exists**. The database will be stored in a local file named `database.sqlite3`.
5. Then run `npm start` to start both the server and the React client.

❗️ **Make sure to commit all changes to the master branch!**

## Technical Notes

- The server is running with [nodemon](https://nodemon.io/), which will automatically restart whenever you modify and save a file.
- The database provider is SQLite, which will store data in a file local to your repository called `database.sqlite3`. The ORM [Sequelize](http://docs.sequelizejs.com/) is used on top of it. You should interact with Sequelize. **Please spend some time reading the Sequelize documentation before starting the exercise.**
- To authenticate users, use the `getProfile` middleware located under `src/middleware/getProfile.js`. Users are authenticated by passing `profile_id` in the request header. Once authenticated, the user's profile will be available under `req.profile`. Ensure that only users associated with a contract can access their respective contracts.
- The server is running on port 3001.

## Full stack feature to implement

### User flow
1. The user is presented with a drop-down of profiles (of type `client`), along with a login button.
2. The user selects a profile and logs in.
3. The main interface includes the following elements:
    1. Buttons to deposit pre-set amounts (1, 5, 10, 50, 100, 500) are available at all times. Clicking these buttons creates a deposit and updates the balance.
    2. The logged-in profile's balance is displayed at all times.
    3. A home screen with an auto-complete field populated by profiles (of type `contractor`) is shown, labeled "Pay Jobs for…", along with a "Continue" button.
4. The user selects a profile and continues.
5. A list of paid and unpaid jobs for the selected contractor is presented.
6. The user can pay an unpaid job with a button click. Payment should not be possible if the profile does not have a sufficient balance.

## APIs To Implement (these support your feature)

Below is a list of the required APIs for the application.

1. **_GET_** `/profiles` - Returns a list of profiles, useful for your login.

2. **_GET_** `/jobs/unpaid` - Get all unpaid jobs for a user (**_either_** a client or contractor), but only for **_active contracts_**.

3. **_POST_** `/jobs/:job_id/pay` - Pay for a job. A client can only pay if their balance is greater than or equal to the amount due. The payment amount should be moved from the client's balance to the contractor's balance.

4. **_POST_** `/balances/deposit/:userId` - Deposit money into a client's balance. A client cannot deposit more than 25% of the total of jobs to pay at the time of deposit.

5. **_GET_** `/admin/best-profession?start=<date>&end=<date>` - Returns the profession that earned the most money (sum of jobs paid) for any contractor who worked within the specified time range.

6. **_GET_** `/admin/best-clients?start=<date>&end=<date>&limit=<integer>` - Returns the clients who paid the most for jobs within the specified time period. The `limit` query parameter should be applied, and the default limit is 2.
```json
[
    {
        "id": 1,
        "fullName": "Reece Moyer",
        "paid" : 100.3
    },
    {
        "id": 200,
        "fullName": "Debora Martin",
        "paid" : 99
    },
    {
        "id": 22,
        "fullName": "Debora Martin",
        "paid" : 21
    }
]
```


## Going Above and Beyond the Requirements

Given the time expectations for this exercise, we don't expect anyone to submit anything super fancy. However, if you find yourself with extra time, any extra credit item(s) that showcase your unique strengths would be awesome! 🙌

For example, writing some unit tests would be great.

## Submitting the Assignment

When you've finished the assignment, zip your repo (make sure to include the .git folder) and send us the zip file.

Thank you and good luck! 🙏
