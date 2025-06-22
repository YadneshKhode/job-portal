# Below features i would have liked to implement

1. I would have liked to add logging mechanism (with proper way to debug issues in production)
2. Using above log messages enable querying in Kibana and monitoring in Grafana
3. Standardise the API contract for response body for e.g. all APIs would have same response body like - this helps front end
    {
        statusCode: 200,
        statusMessage: 'Success',
        data: [] // the data for this API
    }
4. I would have segregated front end code using proper design patterns
5. I would have also added indexing etc, and other optimizations in DB
6. I would have added more security at backend (SSO_TOKEN based implementation, encryption of data in DB, so no one could read data
    a middleware layer would decrypt the data and do calculations and save data to DB encrypted so no human eye could see it - this has limited use case in our task, but for financial operations it would be necessary)
7. add pagination to all APIs, in real life we would have lakhs of records, the front end wont be able to handle such data
8. Could implement Cluser for handling traffic in case we dont have Kubernetes deployment (since node js runs only on single core, and if we have quad core CPU we could use spwn and deploy this on all cores and use cluser to route traffic)
9. Add unit and integration test cases