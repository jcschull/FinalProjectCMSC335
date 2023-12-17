const http = require("http");
const path = require("path");
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const portNumber = 7002;
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 
const user = process.env.MONGO_DB_USERNAME;
const pass = process.env.MONGO_DB_PASSWORD;
const database = process.env.MONGO_DB_NAME; 
const collection = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${user}:${pass}@finalprojectcluster.llbyeqs.mongodb.net/?retryWrites=true&w=majority`;
const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "htmls"));

/* view/templating engine */
app.set("view engine", "ejs");

/* By default browsers try to request /favicon.ico from the */
/* root of a hostname. You will see such a request when runnning */
/* the example */

/* In future examples, for simplicity, we will use app.listen(portNumber) */
app.listen(portNumber, (err) => {
  if (err) {
    console.log("Starting server failed.");
  } else {
    console.log(`To access server: http://localhost:${portNumber}`);
  }
});

//~~~ Spotify

const client_id = 'a4b7d59c1cfd42acb2f6b925f8d981da';
const client_secret = '4ad6e84597fb444db9732cfd9582ff99';

async function getToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
      },
    });
  
    return await response.json();
}

async function getTrackInfo(access_token) {
    const response = await fetch("https://api.spotify.com/v1/tracks/4cOdK2wGLETKBW3PvgPWqT", {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + access_token },
    });
  
    return await response.json();
}

async function getSearch(query, access_token) {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=artist&market=US`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + access_token },
    });

    return await response.json();
}

/**
 * Takes in json result of getSearch and outputs tuple:
 * (name, genres, images list, external urls)
 * @param {json} searchResults 
 */
function processSearch(searchResults){
    /*
    Artist Object Path
    artists -> items
    for each item: (name; genres; images[url, height, width]; external_urls -> spotify)
    */
    let output = [];
    let artistList = searchResults.artists.items;

    artistList.forEach((elem) => {
        let currVar = {};

        currVar.name = elem.name;
        currVar.genres = elem.genres;
        currVar.followers = elem.followers.total;
        currVar.imagesList = elem.images;
        currVar.spotify = `<a href=\"${elem.external_urls.spotify}\" target=\"_blank\">Artist Page</a>`;

        output.push(currVar);
    });

    return output
}

// print results to console
getToken().then(response => {
    getTrackInfo(response.access_token).then(profile => {
    console.log(profile)
    })
});

app.get("/", async (request, response) => {
    response.render("search.ejs", {formTag: `<form action=\"http://localhost:${portNumber}/processSearch\" method="post">`})
  });

app.post("/processSearch", async (request, response) => {
  console.log(`Received url: ${request.url}`);
  let token = await getToken();
  let searchResults = await getSearch("Zach Bryan", token.access_token);
  let results = processSearch(searchResults);

  let findArtist = {
    name: results
  }

  await insertArtist(findArtist)
  
  //response.render("index", {result: JSON.stringify(results)});
  response.render("ResultsPage", results[0]);
})

async function insertArtist(artist){
  try {
      await client.connect();
     
      /* Inserting */
      await client.db(database).collection(collection).insertOne(artist);  
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}