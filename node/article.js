//article microservice
const express = require('express');
const app = express();

const { MongoClient } = require("mongodb");
const { resolve } = require('path');
const uri="mongodb://localhost:27017";
const client = new MongoClient(uri);

let port = 3011;

app.use(express.json());

//CREATE
app.post('/', async (request, response)=> {
    userPermissions = await getUserPermissions(request.body.sessionID);

    let articleTotal;
    if ((userPermissions == "author") && (request.body.articleTitle != null) && (request.body.articleTeaser != null) && (request.body.articleAuthor != null) && (request.body.articleBody != null) && (request.body.articleTags != null)){
        try {
            await client.connect();
            let articleQueryCursor = await client.db('daily-bugle').collection('article').find().sort({_id: -1}).limit(1);
            if (await articleQueryCursor.hasNext()){
                articleTotal = await articleQueryCursor.next();
                articleTotal = articleTotal.id+1;
            } else {
                articleTotal=0;
            }
        } finally {
            client.close();
        }

        const articleData = {
            "id": articleTotal,
            "title": request.body.articleTitle,
            "teaser": request.body.articleTeaser,
            "author": request.body.articleAuthor,
            "body": request.body.articleBody,
            "date_created": new Date(),
            "date_edited": new Date(),
            "tags": request.body.articleTags,
            "comments": []
        };

        try {
            await client.connect();
            await client.db('daily-bugle').collection('article')
            .insertOne(articleData)
            .then(results => response.send("ARTICLE POST SUCCESS"))
            .catch(error=> console.error(error));
        } catch(error){
            response.send("ARTICLE POST FAILURE")
        } finally {
            client.close();
        }
    } else {
        response.send("ARTICLE POST FAILURE");
    }
});

//READ
app.get('/', async (request, response)=> {
    const articleFilter = {"id": request.body.id};
    try{
        await client.connect();
        let articleJSON = await client.db('daily-bugle').collection('article').find(articleFilter).toArray();
        response.send(articleJSON);
    } catch(error) {
        console.error(error);
    } finally {
        client.close();
    }
});

//UPDATE AND PUT
app.put('/', async (request, response)=> {
    const articleFilter = {"id": request.body.id};
    userPermissions = await getUserPermissions(request.body.sessionID);

    if ((userPermissions == "author") && (request.body.id != null)){
        const updateArticle = {$set: {
            "title": request.body.articleTitle,
            "teaser": request.body.articleTeaser,
            "author": request.body.articleAuthor,
            "body": request.body.articleBody,
            "date_edited": new Date(),
            "tags": request.body.articleTags
        }};
        try{
            await client.connect();
            await client.db('daily-bugle').collection('article').updateOne(articleFilter, updateArticle)
            .then(results=>response.send("ARTICLE UPDATE SUCCESS"));
        } catch (error){
            response.send("ARTICLE UPDATE FAILURE");
        } finally {
            client.close();
        }
    } else {
        response.send("ARTICLE UPDATE FAILURE");
    }
    
});

//DELETE

app.delete('/', async (request, response)=> {
    const articleFilter = {"id": request.body.id};
    userPermissions = await getUserPermissions(request.body.sessionID);

    if ((userPermissions=="author")&&(request.body.id != null)){
        try{
            await client.connect();
            await client.db('daily-bugle').collection('article')
            .deleteOne(articleFilter)
            .then(function(result){
                if (result.deletedCount == 1){
                    response.send("ARTICLE DELETE SUCCESS");
                } else{
                    response.send("ARTICLE DELETE FAILURE");
                }
            })
            .catch(error=> response.send("ARTICLE DELETE FAILURE"));
        } catch(error) {
            console.error(error);
        } finally {
            client.close();
        }
    } else {
        response.send("ARTICLE DELETE FAILURE");
    }
});

async function getUserPermissions(sessionID){
    let userPermissions;
    await fetch("https://kasm.io/api/dailybugle/auth/perms",
	{
		method:"POST",
		headers:{
			'Accept':'application/json',
			'Content-type':'application/json'
		},
		body: JSON.stringify({"sessionID":sessionID})
	}).then(function (response) {
        return response.text();
    }).then(responseText => userPermissions=responseText);
    try{
        userPermissions = JSON.parse(userPermissions).accountType;
    } catch {
        userPermissions = "guest";
    }
    return userPermissions;
}

app.listen(port, ()=> console.log(`listening on port ${port}`));