"use strict";

const bcrypt = require('bcrypt');
const saltRounds = 10;

const crypto = require('crypto');

const util = require('util');

const express = require('express');
const port = process.env.PORT || 8080;
const server = express();

const Readable = require('stream').Readable;

const cloudAuth = require("./cloudinary.json");
const cloudinary = require('cloudinary').v2;
cloudinary.config(cloudAuth);

const metascraper = require('metascraper')([
    require('metascraper-author')(),
    require('metascraper-date')(),
    require('metascraper-description')(),
    require('metascraper-image')(),
    require('metascraper-logo')(),
    require('metascraper-clearbit')(),
    require('metascraper-publisher')(),
    require('metascraper-title')(),
    require('metascraper-url')()
  ]);

const got = require('got');

const objectID = require('mongodb').ObjectID;
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const uri = require("./url.json").url;
const client = new MongoClient(uri, {useNewUrlParser: true,  useUnifiedTopology: true});

const fileSize = 10000000; //10MB in bytes

let users;
let rooms;
let messages;
let websockets = {
    global: []
};
let connections = {};
let globalExists;

let globalID;

let attachments = [];

client.connect(async function(err) {
    assert.equal(null, err);
    console.log("Connected to Database");
  
    let db = client.db('WebsiteDB');

    users = db.collection('Users');
    rooms = db.collection('Rooms');
    messages = db.collection('Messages');
    
    let global = await rooms.find({name: {$eq:"global"}});

    globalExists = global.hasNext();
    
    globalID = (await global.next())._id;

    if(!globalExists) {
        await rooms.insertOne({name: "global", users: [], messages: []});
    }
});

server.set('view engine', 'ejs');
server.set('views', `${__dirname}/views`);

server.use(express.static('./static'));

server.get('/', (req, res) => {
    res.render('index', req.templates);
});

server.get('/imageQuery', async (req, res) => {
    try {
        const image = await got(req.query.url, {decompress: false});

        res.set(image.headers);
        res.send(image.rawBody);
    } catch {
    }
});

server.get('/attachmentQuery/*', async (req, res) => {
    try {
        const image = await got(req.query.url, {decompress: false});

        res.set(image.headers);
        res.set('content-disposition', '');
        res.send(image.rawBody);
    } catch {
    }
});

server.get('/attachmentQuery', async (req, res) => {
    try {
        const image = await got(req.query.url, {decompress: false});

        res.set(image.headers);
        res.set('content-disposition', '');
        res.send(image.rawBody);
    } catch {
    }
});


server.use((req, res) => {
    res.render('404', req.templates);
});

const http = require("http");
let chat_server = http.createServer(server);
let WebSocket = require("ws");

let webSocketServer = WebSocket.Server;

function contains(item, arr) {
    for(let i = 0; i < arr.length; i++) {
        if(arr[i] === item) {
            return true;
        }
    }
    return false;
}

let colors = ["blue", "pink", "purple", "orange", "grey", "green"];

chat_server.listen(port, function() {
    console.log(new Date() + " Server is listening");
});

let wsServer = new webSocketServer({
    server: chat_server
});

function indexOfID(array, element) {
    for(let i = 0; i < array.length; i++) {
        if(array[i].toString() === element) {
            return i;
        }
    }
    return -1;
}

function removeAndReturn(item, array) {
  let newArray = [];
  for(let i = 0; i < array.length; i++) {
    if(array[i] !== item) {
      newArray.push(array[i]);
    }
  }
  return newArray;
}

wsServer.on('connection', function connection(connection) {

    // if(!users) {
    //     connection.close();
    //     console.log('closing ws');
    //     console.log(users);
    // }

    let userName;
    let userRooms = [globalID];
    let currentRoom = false;
    let userColor = colors[Math.floor(Math.random() * colors.length)];
    let id;
    let screenName;
    let randomID;
    let currentIndex = 0;
    let types = [];
    let friendsList;

    connection.on('message', async function(message, isBinary) {
        message = isBinary ? message : message.toString();

        function generateRandomID(digits) {
            let buf = crypto.randomBytes(digits);
            return buf.toString('hex');
        }

        async function getRooms(sendID) {
            let joinedRooms = await users.aggregate([
                {
                  $match: {
                    _id: sendID
                  }
                },
                {
                  $unwind: "$rooms"
                },
                {
                  $lookup: {
                    from: "Rooms",
                    localField: "rooms",
                    foreignField: "_id",
                    as: "rooms"
                  }
                },
                {
                  $project: {
                    roomId: {
                      $arrayElemAt: [
                        "$rooms._id",
                        0
                      ]
                    },
                    roomName: {
                      $arrayElemAt: [
                        "$rooms.name",
                        0
                      ]
                    },
                    roomUsers: {
                      $arrayElemAt: [
                        "$rooms.users",
                        0
                      ]
                    },
                    messageIds: {
                      $arrayElemAt: [
                        "$rooms.messages",
                        0
                      ]
                    }
                  }
                },
                {
                  $lookup: {
                    from: "Users",
                    localField: "roomUsers",
                    foreignField: "_id",
                    as: "roomUsers"
                  }
                },
                {
                  $project: {
                    roomId: 1,
                    roomName: 1,
                    roomUsers: "$roomUsers.screenName",
                    lastMessageId: {
                      $arrayElemAt: [
                        "$messageIds",
                        -1
                      ]
                    }
                  }
                },
                {
                  $lookup: {
                    from: "Messages",
                    localField: "lastMessageId",
                    foreignField: "_id",
                    as: "message"
                  }
                },
                {
                  $project: {
                    roomId: 1,
                    roomName: 1,
                    roomUsers: 1,
                    time: {
                      $arrayElemAt: [
                        "$message.time",
                        0
                      ]
                    },
                    message: {
                      $arrayElemAt: [
                        "$message.data",
                        0
                      ]
                    },
                    user: {
                      $arrayElemAt: [
                        "$message.userId",
                        0
                      ]
                    }
                  }
                },
                {
                  $lookup: {
                    from: "Users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                  }
                },
                {
                  $project: {
                    _id: 0,
                    roomId: 1,
                    roomName: 1,
                    roomUsers: 1,
                    time: 1,
                    message: 1,
                    author: {
                      $arrayElemAt: [
                        "$user.screenName",
                        0
                      ]
                    }
                  }
                }, 
                { 
                    $sort: { time: 1 } 
                }
              ]).toArray();
              for(let i = 0; i < joinedRooms.length; i++) {
                  if(joinedRooms[i].roomName === null) {
                    let roomNames = joinedRooms[i].roomUsers;
                    roomNames = removeAndReturn(screenName, roomNames);
                    joinedRooms[i].roomName = roomNames.join(', ');
                  }
              }
              for(let i = 0; i < joinedRooms.length; i++) {
                if(websockets[joinedRooms[i].roomId] === undefined) {
                    websockets[joinedRooms[i].roomId] = [];
                }
                if(!websockets[joinedRooms[i].roomId].includes(id)) {
                    websockets[joinedRooms[i].roomId].push(id);
                    websockets[joinedRooms[i].roomId].push(connection);
                }
            }
            return joinedRooms;
        }

        async function sendHistory(sendRoom, start, end) {
            let historyLength = await rooms.aggregate([
                {
                  $match: {
                    _id: sendRoom
                  }
                },
                {
                  $project: {
                    messageCount: {
                      $size: "$messages"
                    }
                  }
                }
              ]).next();
            let messageCount = historyLength.messageCount;
            if (start >= messageCount) {
                connection.send(JSON.stringify( {type: "history", data: [], room: sendRoom}));
                return [];
            }
            let historyArray = await rooms.aggregate([
                {
                  $match: {
                    _id: sendRoom
                  }
                },
                {
                  $project: {
                    _id: 1,
                    messageIds: {
                      $slice: [
                        "$messages",
                        -end,
                        end > messageCount ? messageCount - start : end - start
                      ]
                    }
                  }
                },
                {
                  $unwind: "$messageIds"
                },
                {
                  $lookup: {
                    from: "Messages",
                    localField: "messageIds",
                    foreignField: "_id",
                    as: "message"
                  }
                },
                {
                  $project: {
                    message: {
                      $arrayElemAt: [
                        "$message",
                        0
                      ]
                    }
                  }
                },
                {
                  $lookup: {
                    from: "Users",
                    localField: "message.userId",
                    foreignField: "_id",
                    as: "user"
                  }
                },
                {
                  $project: {
                    message: 1,
                    user: {
                      $arrayElemAt: [
                        "$user",
                        0
                      ]
                    }
                  }
                },
                {
                  $project: {
                    _id: 0,
                    time: "$message.time",
                    data: "$message.data",
                    Room: "$_id",
                    userId: "$user._id",
                    author: "$user.screenName",
                    color: "$user.color",
                    attachments: "$message.attachments",
                    types: "$message.types",
                    messageId: "$message._id"
                  }
                }
              ]).toArray();
            connection.send(JSON.stringify( {type: "history", data: historyArray.reverse(), room: sendRoom}));
        }

        async function getUser(name) {
            let userEntry = await users.aggregate([
                {
                  $match: {
                    name: name
                  }
                },
                {
                  $lookup: {
                    from: "Users",
                    localField: "friends",
                    foreignField: "_id",
                    as: "friends"
                  }
                }, 
                {
                  $lookup: {
                    from: "Users",
                    localField: "friendRequests",
                    foreignField: "_id",
                    as: "friendRequests"
                  }
                },
                {
                  $lookup: {
                    from: "Users",
                    localField: "friendRequestsSent",
                    foreignField: "_id",
                    as: "friendRequestsSent"
                  }
                },
                {
                  $project: {
                    color: 1,
                    screenName: 1,
                    password: 1,
                    name: 1,
                    rooms: 1,
                    salt: 1,
                    loginID: 1,

                    friends: {
                      $map: {
                        input: "$friends",
                        as: "friend",
                        in: {
                          id: "$$friend._id",
                          name: "$$friend.screenName"
                        }
                      }
                    },
                    friendRequests: {
                      $map: {
                        input: "$friendRequests",
                        as: "friendRequest",
                        in: {
                          id: "$$friendRequest._id",
                          name: "$$friendRequest.screenName"
                        }
                      }
                    },
                    friendRequestsSent: {
                      $map: {
                        input: "$friendRequestsSent",
                        as: "friendRequestSent",
                        in: {
                          id: "$$friendRequestSent._id",
                          name: "$$friendRequestSent.screenName"
                        }
                      }
                    }
                  }
                }
              ]).next();
              return userEntry;
        }

        async function getUserID(id) {
            let userEntry = await users.aggregate([
                {
                  $match: {
                    loginID: id
                  }
                },
                {
                  $lookup: {
                    from: "Users",
                    localField: "friends",
                    foreignField: "_id",
                    as: "friends"
                  }
                }, 
                {
                  $lookup: {
                    from: "Users",
                    localField: "friendRequests",
                    foreignField: "_id",
                    as: "friendRequests"
                  }
                },
                {
                  $lookup: {
                    from: "Users",
                    localField: "friendRequestsSent",
                    foreignField: "_id",
                    as: "friendRequestsSent"
                  }
                },
                {
                  $project: {
                    _id: 1,
                    color: 1,
                    screenName: 1,
                    name: 1,
                    rooms: 1,
                    friends: {
                      $map: {
                        input: "$friends",
                        as: "friend",
                        in: {
                          id: "$$friend._id",
                          name: "$$friend.screenName"
                        }
                      }
                    },
                    friendRequests: {
                      $map: {
                        input: "$friendRequests",
                        as: "friendRequest",
                        in: {
                          id: "$$friendRequest._id",
                          name: "$$friendRequest.screenName"
                        }
                      }
                    },
                    friendRequestsSent: {
                      $map: {
                        input: "$friendRequestsSent",
                        as: "friendRequestSent",
                        in: {
                          id: "$$friendRequestSent._id",
                          name: "$$friendRequestSent.screenName"
                        }
                      }
                    }
                  }
                }
              ]).next();
              return userEntry;
        }

        function bufferToStream(buffer) {
            let stream = new Readable();
            stream.push(buffer);
            stream.push(null);

            return stream;
        }

        try {

            if(Buffer.isBuffer(message) && message.length <= fileSize) {
                let index = currentIndex;
                currentIndex ++;

                let hash = crypto.createHash('sha256');
                hash.update(message);

                let hex = hash.digest('hex');

                let stream = cloudinary.uploader.upload_stream({public_id: hex, resource_type: "raw"}, function(error, result) {
                    attachments[index] = "/attachmentQuery/" + types[index] + "?url=" + result['secure_url'];

                    if(!attachments.includes(undefined)) {
                        connection.send(JSON.stringify({type: 'attachments', data: attachments, types: types}));
                    }
                });

                bufferToStream(message).pipe(stream);

            } else {
                message = JSON.parse(message);
                if(message.type === 'name') {
                    if(message.data) {
                        userName = message.data;
                        screenName = message.data;
                        let userEntry = await users.find({name: {$eq:userName}});
                        let userExists = await userEntry.hasNext();
                        let passwordHash;
                        let passwordSalt;

                        if(!userExists && message.newUser === true) {
                            bcrypt.genSalt(saltRounds, (err, salt) => {
                                bcrypt.hash(message.password, salt, async (err, hash) => {
                                    passwordHash = hash;
                                    passwordSalt = salt;
                                    screenName = message.screenName;
                                    randomID = generateRandomID(10);
                                    id = (await users.insertOne({name: userName, color: userColor, screenName: message.screenName, password: passwordHash, salt: passwordSalt, rooms: [], loginID: randomID, friends: []})).insertedId;
                                    connection.send(JSON.stringify({ type: "color", data: userColor }));
                                    connection.send(JSON.stringify({ type: "name", data: screenName}));
                                    currentRoom = globalID;
                                    websockets[globalID].push(id);
                                    websockets[globalID].push(connection);
                                    connections[id] = connection;
                                    await rooms.updateOne({_id: {$eq: globalID}}, {$push: {users: id}});
                                    await users.updateOne( {name: {$eq: userName}}, {$push: {rooms: globalID}});

                                    connection.send(JSON.stringify( {type: "id", data: id}));
                                    // connection.send(JSON.stringify( {type: "room", data: "global"}));
                                    connection.send(JSON.stringify( {type: "createAccount", data: '200'} ));
                                    sendHistory(globalID, 0, 30);
                                });
                            });
                        } else if(message.newUser === true && userExists) {
                            connection.send(JSON.stringify( {type: "createAccount", data: '201'} ));
                        } else {
                            let userDBEntry = await getUser(userName);
                            let salt = userDBEntry.salt;
                            bcrypt.hash(message.password, salt, async (err, hash) => {
                                passwordHash = hash;
                                if(passwordHash === userDBEntry.password) {
                                    let joinedRooms = userDBEntry.rooms;
                                    // let invalidRooms = [...joinedRooms];
                                    // userName = userDBEntry.name;
                                    // await users.findOneAndUpdate({name: {$eq: userName}}, {$pull: {rooms: {$type: "string"}}}, {returnNewDocument: true});
                                    // let userDocument = await (await users.find({name: {$eq: userName}})).next();
                                    // let validRooms = userDocument.rooms;
                                    // for(let i = 0; i < validRooms.length; i++) {
                                    //     invalidRooms.splice(invalidRooms.indexOf(validRooms[i]), 1);
                                    // }
                                    // let convertedRooms = [];
                                    // for(let i = 0; i < invalidRooms.length; i++) {
                                    //     joinedRooms.splice(joinedRooms.indexOf(invalidRooms[i]), 1);
                                    //     let roomid = (await (await rooms.find({name: {$eq: invalidRooms[i]}})).next())._id;
                                    //     joinedRooms.push(roomid);
                                    //     convertedRooms.push(roomid);
                                    // }
                                    // users.update({name: {$eq:userName}}, {$addToSet: {rooms: {$each: convertedRooms}}});
                                    friendsList = userDBEntry.friends;
                                    userName = userDBEntry.name;
                                    randomID = userDBEntry.loginID;
                                    if(!friendsList) {
                                        users.updateOne( {name: {$eq: userName}}, {$set: {friends: []}} );
                                        friendsList = [];
                                    }

                                    connection.send( JSON.stringify({type: "login", data: "success", status: "200", reconnectID: randomID, friends: friendsList}));
                                    id = userDBEntry._id;
                                    let roomsObject = await getRooms(id);
                                    connection.send(JSON.stringify({type: "joinedRooms", data: roomsObject}));
                                    userRooms = joinedRooms;
                                    screenName = userDBEntry.screenName;
                                    userColor = userDBEntry.color;
                                    connections[id] = connection;
                                    if(message.loginID) {
                                        connection.send(JSON.stringify({type: 'loginKey', data: randomID}));
                                    }
                                    connection.send(JSON.stringify({ type: "color", data: userColor }));
                                    connection.send(JSON.stringify({ type: "name", data: screenName}));
                                    connection.send(JSON.stringify( {type: "id", data: id}));
                                    // connection.send(JSON.stringify( {type: "room", data: "global"}));
                                    let pendingFriends = userDBEntry.friendRequestsSent || [];
                                    let friendRequestEntries = userDBEntry.friendRequests || [];

                                    if(userDBEntry.friendRequestsSent) {
                                      connection.send(JSON.stringify({type: "pendingFriends", data: pendingFriends, from: "login"}));
                                    }
                                    if(userDBEntry.friendRequests) {
                                      connection.send(JSON.stringify({type: 'friendRequests', data: friendRequestEntries}));
                                    }

                                    for(let i = 0; i < joinedRooms.length; i++) {
                                        if(websockets[joinedRooms[i]] === undefined) {
                                            websockets[joinedRooms[i]] = [];
                                        }
                                        if(!websockets[joinedRooms[i]].includes(id)) {
                                            websockets[joinedRooms[i]].push(id);
                                            websockets[joinedRooms[i]].push(connection);
                                        }
                                    }
                                    currentRoom = globalID;
                                    sendHistory(globalID, 0, 50);

                                } else {
                                    //status code 201 means bad username/password
                                    connection.send(JSON.stringify({type: "login", data: "error", status: "201"}));
                                }
                            });
                        }
                    }
                } else if(message.type === 'room') {
                    // let roomExists = await rooms.find({name: {$eq: message.data}}).hasNext();
                    if(typeof userName === "string" && Array.isArray(message.data)) {
                        let formattedIDs = [];
                        for(let i = 0; i < message.data.length; i++) {
                            formattedIDs.push(new objectID(message.data[i]));
                        }

                        let validUsers = await users.find({_id: {$in: formattedIDs}});
                        let validIDs = [id];

                        let usernames = [screenName];
                        await validUsers.forEach( function(nextUser) {
                            let nextID = nextUser._id
                            usernames.push(nextUser.screenName);
                            validIDs.push(nextID);
                        });

                        let room = await rooms.insertOne({name: null, users: validIDs, messages: []});
                        let roomid = room.insertedId;
                        users.updateMany({ _id: { $in: validIDs}}, { $push: { rooms: roomid } });

                        websockets[roomid] = [];
                        for(let i = 0; i < validIDs.length; i++) {
                            if(connections.hasOwnProperty(validIDs[i])) {
                                websockets[roomid].push(validIDs[i]);
                                websockets[roomid].push(connections[validIDs[i]]);
                            }
                        }

                        userRooms.push(roomid);
                        currentRoom = roomid;
                        for(let i = 1; i < websockets[currentRoom].length; i += 2) {
                            websockets[currentRoom][i].send(JSON.stringify({type: "joinRoom", data: roomid, name: usernames}));
                        }
                        // connection.send(JSON.stringify( {type: "room", data: currentRoom}));
                        // sendHistory(currentRoom, 0, 50);
                    }
                } else if(message.type === 'message' && currentRoom != false) {
                    if((/\S/.test(message.data) && message.data) || message.attachments) {
                        let messageData = message.data;
                        if(!(/\S/.test(message.data) && message.data)) {
                            messageData = "";
                        }
                        let json = {
                            time: new Date().getTime(),
                            author: screenName,
                            color: userColor,
                            data: messageData,
                            Room: currentRoom,
                            userId: id,
                            attachments: message.attachments,
                            types: message.types,
                        };
                        let messageID = (await messages.insertOne({time: json.time, data: json.data, room: json.Room, userId: json.userId, attachments: json.attachments, types: json.types})).insertedId;
                        await rooms.updateOne({_id: {$eq: json.Room}}, {$push: {messages: messageID}});
                        for(let user = 1; user < websockets[currentRoom].length; user += 2) {
                            if(websockets[currentRoom][user].readyState === WebSocket.OPEN) {
                                websockets[currentRoom][user].send(JSON.stringify({ type:"message", data: json, messageID: messageID}));
                            }
                        }
                    }
                } else if(message.type === 'ping') {
                    connection.send(JSON.stringify( {type:"ping", data: "ping"}));
                } else if(message.type === "color change") {
                    if(colors.includes(message.data)) {
                        let userDBEntry = await (await users.find({name: {$eq: userName}})).next();
                        let joinedRooms = userDBEntry.rooms;
                        await users.updateOne( {name: {$eq: userName}}, {$set: {color: message.data}});
                        let oldColor = userColor;
                        userColor = message.data;
                        for(let i = 0; i < joinedRooms.length; i++) {
                            for(let j = 1; j < websockets[joinedRooms[i]].length; j += 2) {
                                websockets[joinedRooms[i]][j].send(JSON.stringify({type: "colorChange", id: id, color: message.data, oldColor: oldColor}));
                            }
                        }
                    }
                } else if(message.type === "name change") {
                        await users.updateOne( {name: {$eq: userName}}, {$set: {screenName: message.name}});
                        screenName = message.name;
                } else if(message.type === "autoLogin") {
                    let userDBEntry = await getUserID(message.data);
                    // let invalidRooms = [...joinedRooms];
                    // userName = userDBEntry.name;
                    // await users.findOneAndUpdate({name: {$eq: userName}}, {$pull: {rooms: {$type: "string"}}}, {returnNewDocument: true});
                    // let userDocument = await (await users.find({name: {$eq: userName}})).next();
                    // let validRooms = userDocument.rooms;
                    // for(let i = 0; i < validRooms.length; i++) {
                    //     invalidRooms.splice(invalidRooms.indexOf(validRooms[i]), 1);
                    // }
                    // let convertedRooms = [];
                    // for(let i = 0; i < invalidRooms.length; i++) {
                    //     joinedRooms.splice(joinedRooms.indexOf(invalidRooms[i]), 1);
                    //     let roomid = (await (await rooms.find({name: {$eq: invalidRooms[i]}})).next())._id;
                    //     joinedRooms.push(roomid);
                    //     convertedRooms.push(roomid);
                    // }
                    // users.update({name: {$eq:userName}}, {$addToSet: {rooms: {$each: convertedRooms}}});
                    let friendsListJSON = userDBEntry.friends;
                    randomID = message.data;
                    connection.send( JSON.stringify({type: "login", data: "success", status: "200", reconnectID: randomID, friends: friendsListJSON}));
                    id = userDBEntry._id;
                    userName = userDBEntry.name;
                    screenName = userDBEntry.screenName;
                    let roomsObject = await getRooms(id);
                    connection.send(JSON.stringify({type: "joinedRooms", data: roomsObject}));
                    userRooms = userDBEntry.rooms;
                    userColor = userDBEntry.color;
                    connections[id] = connection;
                    connection.send(JSON.stringify({ type: "color", data: userColor }));
                    connection.send(JSON.stringify({ type: "name", data: screenName}));
                    connection.send(JSON.stringify( {type: "id", data: id}));
                    let pendingFriends = userDBEntry.friendRequestsSent || [];
                    let friendRequestEntries = userDBEntry.friendRequests || [];

                    if(userDBEntry.friendRequestsSent) {
                      connection.send(JSON.stringify({type: "pendingFriends", data: pendingFriends, from: "autologin"}));
                    }
                    if(userDBEntry.friendRequests) {
                      connection.send(JSON.stringify({type: 'friendRequests', data: friendRequestEntries}));
                    }

                    currentRoom = globalID;
                    sendHistory(globalID, 0, 50);

                } else if(message.type === 'linkPreview') {
                    try {
                        const { body: html, url } = await got(decodeURIComponent(message.data));
                        const metadata = await metascraper({ html, url });

                        let unencodedImage = metadata['image'];
                        let image = encodeURIComponent(unencodedImage);
                        let site = metadata['description'];
                        let title = metadata['title'];
                        let originalLink = decodeURIComponent(message.data);

                        let data;

                        if(unencodedImage) {
                            data = [originalLink, '/imageQuery?url=' + image, site, title];
                        } else {
                            data = [originalLink, null, site, title]
                        }
                        connection.send(JSON.stringify( {type: 'linkPreview', data: data} ));
                    } catch(e) {
                      console.log(e.message);
                        console.log('invalid link: ' + decodeURIComponent(message.data));
                    }
                } else if(message.type === "messageRequest" && userName && message.room && message.start && message.end) {
                    sendHistory(new objectID(message.room), message.start, message.end);
                } else if(message.type === "imagePreview") {
                    let image = decodeURIComponent(message.data);
                    let title = decodeURIComponent(message.data);
                    let data = [image, '/imageQuery?url=' + image, null, title];
                    connection.send(JSON.stringify({type: 'linkPreview', data: data}))
                } else if(message.type === 'attachmentLength') {
                    currentIndex = 0;
                    types = [];
                    types = message.types;
                    attachments = [];
                    for(let i = 0; i < message.data; i++) {
                        attachments[i] = undefined;
                    }
                } else if(message.type === 'reconnect') {
                    let userDBEntry = await (await users.find({loginID: {$eq: message.data}})).next();
                    let joinedRooms = userDBEntry.rooms;
                    userName = await userDBEntry.name;
                    userRooms = userDBEntry.rooms;
                    screenName = await userDBEntry.screenName;
                    userColor = await userDBEntry.color;
                    id = await userDBEntry._id;
                    randomID = message.data;
                    currentRoom = message.room;
                    let start = 0;
                    let sendRoom = message.room;
                    let historyArray = (await rooms.find({name: {$eq: sendRoom}}).next()).messages.reverse();
                    let end = indexOfID(historyArray, message.lastMessage);
                    let messageArray = [];
                    if(end > historyArray.length) {
                        end = historyArray.length;
                    }

                    for(let i = 0; i < joinedRooms.length; i++) {
                        if(websockets[joinedRooms[i]] === undefined) {
                            websockets[joinedRooms[i]] = [];
                        }
                        if(!websockets[joinedRooms[i]].includes(id)) {
                            websockets[joinedRooms[i]].push(id);
                            websockets[joinedRooms[i]].push(connection);
                        }
                    }

                    for(let i = start; i < end; i++) {
                        let messageIdentifier = historyArray[i];
                        let messageData = await messages.find({_id: {$eq: messageIdentifier}}).next();
                        let userAccount = await users.find({_id: {$eq: messageData.userId}}).next();

                        messageArray.push({
                            time: messageData.time,
                            data: messageData.data,
                            Room: messageData.room,
                            userId: messageData.userId,
                            author: userAccount.screenName,
                            color: userAccount.color,
                            attachments: messageData.attachments,
                            types: messageData.types,
                            messageId: messageIdentifier
                        });
                    }
                    messageArray.reverse();
                    connection.send(JSON.stringify({type: "missedMessages", data: messageArray}));
                } else if(message.type === "joinRoom") {
                    currentRoom = new objectID(message.data);
                    sendHistory(currentRoom, 0, 50);
                } else if(message.type === "emailToID") {
                    let userIdentifier = await (await users.find({name: {$eq: message.data}})).next();
                    if(userIdentifier) {
                        let emailUserName = userIdentifier.screenName;
                        let emailUserID = userIdentifier._id;
                        connection.send(JSON.stringify({type: "emailToID", data: [message.data, emailUserName, emailUserID]}));
                    } else {
                        //user with that email doesn't exist, send something to the frontend to mark that email as invalid
                        connection.send(JSON.stringify({type: "emailToID", data: message.data}));
                    }
                } else if(message.type === "friendRequest") {
                  let userIdentifier = await (await users.find({name: {$eq: message.data}})).next();
                  if(userIdentifier) {
                      let emailUserName = userIdentifier.screenName;
                      let emailUserID = userIdentifier._id;
                      let emailJSON = {id: emailUserID, name: emailUserName};
                      let userDBEntry = await getUser(userName);
                      let ifFriendRequests;
                      if(userDBEntry.friendRequests) {
                        ifFriendRequests = userDBEntry.friendRequests.some((friend) => {return friend.id.toString() === emailJSON.id.toString()});
                      } else {
                        ifFriendRequests = false;
                      }

                      let ifFriendRequestsSent;
                      if(userDBEntry.friendRequestsSent) {
                        ifFriendRequestsSent = userDBEntry.friendRequestsSent.some((friend) => {return friend.id.toString() == emailJSON.id.toString()});
                      } else {
                        ifFriendRequestsSent = false;
                      }

                      let isFriends = userDBEntry.friends.some((friend) => friend.id.toString() == emailJSON.id.toString());
                      
                      if(!isFriends && !ifFriendRequests && !ifFriendRequestsSent) {
                          users.updateOne({_id: {$eq: emailUserID}}, {$push: {friendRequests: id}});
                          users.updateOne({_id: {$eq: id}}, {$push: {friendRequestsSent: emailUserID}});
                          connection.send(JSON.stringify({type: "pendingFriend", email: message.data, data: emailUserName, id: emailUserID}));
                          if(connections.hasOwnProperty(emailUserID)) {
                              connections[emailUserID].send(JSON.stringify({type: "friendRequest", id: id, data: screenName}));
                          }
                      } else if(ifFriendRequests) {
                          users.updateOne({_id: {$eq: emailUserID}}, {$push: {friends: id}});
                          users.updateOne({_id: {$eq: id}}, {$push: {friends: emailUserID}});
                          users.updateOne({_id: {$eq: emailUserID}}, {$pull: {friendRequestsSent: id}});
                          users.updateOne({_id: {$eq: id}}, {$pull: {friendRequests: emailUserID}});
                          connection.send(JSON.stringify({type: "newFriend", email: message.data, data: emailUserName, id: emailUserID}));
                          if(connections.hasOwnProperty(emailUserID)) {
                              connections[emailUserID].send(JSON.stringify({type: "newFriend", email: userName, data: screenName, id: id}));
                          }
                      }
                  }
                } else if(message.type === "acceptedFriend") {
                  let friendID = message.data;
                  let userIdentifier = await (await users.find({_id: {$eq: friendID}})).next();
                  let userDBEntry = await getUserID(id);
                  let pendingFriends = userDBEntry.friendRequests || [];
                  // let friendEntries = await users.find({_id: {$in: pendingFriends}});
                  // let friendNames = friendEntries.map(user => user.screenName);
                  let email = userIdentifier.name;
                  if(pendingFriends.includes(email)) {
                    let emailUserName = userIdentifier.screenName;
                    users.updateOne({_id: {$eq: friendID}}, {$push: {friends: id}});
                    users.updateOne({_id: {$eq: id}}, {$push: {friends: friendID}});
                    users.updateOne({_id: {$eq: friendID}}, {$pull: {friendRequestsSent: id}});
                    users.updateOne({_id: {$eq: id}}, {$pull: {friendRequests: friendID}});
                    connection.send(JSON.stringify({type: "newFriend", email: email, data: emailUserName, id: friendID}));
                    if(connections.hasOwnProperty(friendID)) {
                        connections[friendID].send(JSON.stringify({type: "newFriend", email: userName, data: screenName, id: id}));
                    }
                  }
                }
            }
        } catch(e) {
            console.error(e);
        }
    });
    connection.on("close", function close() {
        for(let room of Object.keys(websockets)) {
            let index = websockets[room].indexOf(id);
            if(index > -1) {
                websockets[room].splice(index, 2);
            }
        }
    });
});