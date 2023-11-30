//authentication microservice
const express = require('express');
const app = express();
const bcrypt = require("bcrypt")

const { MongoClient } = require("mongodb");
const { resolve } = require('path');
const uri="mongodb://localhost:27017";
const client = new MongoClient(uri);

let port = 3010;

app.use(express.json());

//CREATE: register user
app.post('/register', async (request, response)=> {
    let username = request.body.username;
    let password = request.body.password;
    let hashedPassword = await bcrypt.hash(password, 10);
    let userData = {"username": username, "password": hashedPassword, "accountType": "user", "currentSessionID": null};
    let userExists;
    
    //check to see if user exists in database
    try {
        userExists = await client.db('daily-bugle').collection('user').countDocuments({"username": username});
    } catch(error) {
        console.error(error);
    }
    
    //if user does not exist yet create user
    if (userExists == 0){   
        try {
            client.db('daily-bugle').collection('user')
            .insertOne(userData)
            .then(results => response.send("USER CREATE SUCCESS"))
            .catch(error => console.error(error));
        } catch(error) {
            console.error(error);
        }
    } else {
        response.send("USER CREATE FAIL: USER ALREADY EXISTS");
    }   
});

//UPDATE: login user
app.post('/login', async (request, response)=> {
    let username = request.body.username;
    let enteredPassword = request.body.password;

    let userInfo = await client.db('daily-bugle').collection('user').find({"username": username}).toArray();
    console.log(userInfo.length);
    
    if (userInfo.length != 0){
        try{
            const userPassword = userInfo[0].password;
            if (await bcrypt.compare(enteredPassword, userPassword)){
                const sessionID = makeID(20);
                //Update session entry for user
                const userFilter = {"username": username};
                const updateDocument = {$set: {"currentSessionID": sessionID}};
                try{
                    await client.db('daily-bugle').collection('user').updateOne(userFilter, updateDocument);
                } catch {
                    response.send("AUTHENTICATION FAILURE: ERROR");
                }
                response.send({
                    "msg": "AUTHENTICATION SUCCESS",
                    "sessionID": sessionID 
                });
            }
            else{
                response.send("AUTHENTICATION FAILURE: PASSWORD MISMATCH");
            }
        } catch{
            response.send("AUTHENTICATION FAILURE: ERROR");
        }
    } else {
        response.send("AUTHENTICATION FAILURE: USER DOES NOT EXIST");
    }
});

//READ: check permissions for user
app.post('/perms', async (request, response)=> {
    let sessionID = request.body.sessionID;
    let userInfo;
    try {
        userInfo = await client.db('daily-bugle').collection('user').find({"currentSessionID": sessionID}).toArray();
    } catch(error) {
        response.send("AUTHENTICATION CHECK FAILURE")
    }

    if (userInfo.length == 1){
        response.send({
            "msg": "AUTHENTICATION CHECK SUCCESS",
            "username": userInfo[0].username,
            "accountType": userInfo[0].accountType
        });
    } else {
        response.send("AUTHENTICATION CHECK FAILURE");
    }
});

//DELETE: delete user
app.post('/delete', async (request, response)=> {
    let sessionID = request.body.sessionID;
    const userFilter = {"currentSessionID": sessionID};

    try{
        await client.db('daily-bugle').collection('user').deleteOne(userFilter).then(results=> response.send("USER DELETION SUCCESS"));
    } catch (error){
        console.error(error);
        response.send("USER DELETION FAILURE")
    }
});

//Generates a random ID of Length to be used as the sessionID, taken from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function makeID(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

app.listen(port, ()=> console.log(`listening on port ${port}`));