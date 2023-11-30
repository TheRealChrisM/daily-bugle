//ad microservice
const express = require('express');
const app = express();
const TOTAL_ADS = 15
let port = 3012;


const { MongoClient } = require("mongodb");
const { resolve } = require('path');
const uri="mongodb://localhost:27017";
const client = new MongoClient(uri);

app.use(express.json());

//GET Ad
app.get('/', async (request, response)=> {
    let randomID = Math.round(Math.random()*(TOTAL_ADS-1));
    let viewData = {
        "ad_id":randomID,
        "date":new Date(),
        "req_ip":request.headers['x-forwarded-for'],
        "req_agent": request.get('User-Agent'),
        "event_type": "view"
    }
    try{
        //Get Ad URL in Mongo
        let adInfo = await client.db('daily-bugle').collection('ad').find({"ad_id": randomID}).toArray();
        let adUrl = adInfo[0].url;
        //Create Ad View Event in Mongo
        client.db('daily-bugle').collection('adevent')
            .insertOne(viewData)
            .catch(error => console.error(error));

        //Return Ad Link and ID
        response.send({
            "ad_id": randomID,
            "url": adUrl
        });
    }catch{
        response.send("AD FETCH FAILURE");
    }
});

//Register Click



app.listen(port, ()=> console.log(`listening on port ${port}`));