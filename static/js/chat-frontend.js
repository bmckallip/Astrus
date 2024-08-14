content = document.getElementById('content');
let input = document.getElementById('input');
let status = document.getElementById('status');
let roominput = document.getElementById('roominput');
let friendInput = document.getElementById('friendInput');
const ROOMS = document.getElementById('Room_Container');
const attachmentPreview = document.getElementById('attachmentPreviewContainer');
const connectionStatus = document.getElementById('connectionStatus');
const friendsContainer = document.getElementById('Friends_Container');
const friendMenuContainer = document.getElementById('friendMenuContainer');
const fileSize = 10000000; //10MB in bytes
const mobileMenuContainer = document.getElementById('rooms');
let reconnect = false;
let reconnectionID = null;
let lastMessageID = null;
let friendsList = [];
let id = "";

// my color assigned by the server
let myColor = false;
// my name sent to the server
let myName = false;
let userRoom;
let last_message_id = false;
let room = false;
let rooms = [];
let roomElements = [];
let roomClicked = false;
let currentHistory = 0;
let messageNum = 30;
let isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

let attachments = [];
let types = [];

async function getFiles(files) {
    for(let i = 0; i < files.length; i++) {
        let isUnique = true;
        for(let j = 0; j < attachments.length; j++) {
            isUnique = files[i].name !== attachments[j].name || files[i].lastModified !== attachments[j].lastModified || files[i].size !== attachments[j].size || files[i].type !== attachments[j].type;
            if(!isUnique) {
                break;
            }
        }
        if(isUnique) {
            if(await isNonCompressableFile(files[i])) {
                if(files[i].size <= fileSize) {
                    getFile(files[i]);
                } else {
                    alert("Sorry, that file is too big");
                }
            } else {
                getFile(files[i]);
            }
        }
    }
}

function getFile(file) {
    if (file) {
        let image = new Image();

        image.onload = function() {
            //valid image
            if(!file.name.match(/\.gif$/i)) {
                new Compressor(file, {
                    quality: 0.6, 
                    success(result) {
                        if(result.size <= fileSize) {
                            attachments.push(result);
                            types.push(file.name);
                            image.classList = 'imagePreview';
                            let container = document.createElement('div');
                            container.className = "imageContainer";
                            let close = document.createElement('div');
                            close.className = "closeButton";
                            close.appendChild(document.createTextNode("x"));
                            close.onclick = (e) => {
                                let attachmentParent = e.target.parentElement.parentElement;
                                let removeIndex = Array.prototype.indexOf.call(attachmentParent.children, e.target.parentElement);
                                e.target.parentElement.remove();
                                attachments.splice(removeIndex, 1);
                                types.splice(removeIndex, 1);
                                let height = attachmentPreview.offsetHeight;
                                if(height === 0) {
                                    input.classList.remove("attached");
                                }
                            }
                            container.appendChild(close);
                            image.classList = 'imagePreview';
                            container.appendChild(image);
                            attachmentPreview.appendChild(container);
                            input.classList.add("attached");
                        } else {
                            alert("Sorry, that file is too big");
                        }
                        
                    }, 
                    error(e) {
                        console.log(e.message);
                    }
                });
            } else {
                attachments.push(file);
                types.push(file.name);
                let container = document.createElement('div');
                container.className = "imageContainer";
                let close = document.createElement('div');
                close.className = "closeButton";
                close.appendChild(document.createTextNode("x"));
                close.onclick = (e) => {
                    let attachmentParent = e.target.parentElement.parentElement;
                    let removeIndex = Array.prototype.indexOf.call(attachmentParent.children, e.target.parentElement);
                    e.target.parentElement.remove();
                    attachments.splice(removeIndex, 1);
                    types.splice(removeIndex, 1);
                    let height = attachmentPreview.offsetHeight;
                    if(height === 0) {
                        input.classList.remove("attached");
                    }
                }
                container.appendChild(close);
                image.classList = 'imagePreview';
                container.appendChild(image);
                attachmentPreview.appendChild(container);
                input.classList.add("attached");
            }
        };

        image.onerror = function() {
            //TODO: check if image file extension, if so error, if not send to server
            if(file.name.match(/\.(jpe?g|png|gif)$/i)) {
                alert("Error: that image file appears to be invalid");
            } else {
                attachments.push(file);
                types.push(file.name);
                let attachmentContainer = document.createElement('div');
                attachmentContainer.className = "attachmentPreview";
   
                let foreground = document.createElement('div');
                let foregroundText = document.createElement('div');
                let fileImage = document.createElement('img');
                fileImage.src = "/file.svg";
                fileImage.className = "fileImage";
                foreground.appendChild(fileImage);
                let text = document.createTextNode(file.name);
                foregroundText.appendChild(text);
                foregroundText.className = "foregroundText";
                foreground.className = "attachmentForeground";
                foreground.appendChild(foregroundText);
                attachmentContainer.appendChild(foreground);

                let close = document.createElement('div');
                close.className = "closeButton";
                close.appendChild(document.createTextNode("x"));
                close.onclick = (e) => {
                    let attachmentParent = e.target.parentElement.parentElement;
                    let removeIndex = Array.prototype.indexOf.call(attachmentParent.children, e.target.parentElement);
                    attachments.splice(removeIndex, 1);
                    types.splice(removeIndex, 1);
                    e.target.parentElement.remove();
                    let height = attachmentPreview.offsetHeight;
                    if(height === 0) {
                        input.classList.remove("attached");
                    }
                }
                attachmentContainer.appendChild(close);
                
                attachmentPreview.appendChild(attachmentContainer);
                input.classList.add("attached");
            }
        }

        image.src = URL.createObjectURL(file);
    }
 }

function requestHistory() {
    let loader = document.createElement("div");
    loader.className = "messageLoader";
    if(darkModeBool) {
        loader.classList.add("dark");
    }
    content.prepend(loader);
    connection.send(JSON.stringify({type: 'messageRequest', room: userRoom, start: currentHistory, end: currentHistory + messageNum}));
}

function addFriend(friend) {
    let element = document.createElement("p");
    element.className = "friend";
    element.id = friend.id;
    element.onclick = (() => {
        if(friendsSearch.classList.contains("visible")) {
            addFriendRoom(element.id);
        } else {
            switchRoom(element.id);
            mobileMenuContainer.classList.remove("showing");
        } 
    });
    element.appendChild(document.createTextNode(friend.name));
    friendsContainer.prepend(element);
}

function logOut() {
    localStorage.clear();
    location.reload();
}

let timer;

function emojify(element) {
    let msg = "";
    for(let i = 0; i < element.childNodes.length; i++) {
        if(element.childNodes[i].nodeName === "#text") {
            msg += element.childNodes[i].data;
        } else if(element.childNodes[i].nodeName === "IMG") {
            msg += element.childNodes[i].alt;
        } else if (element.childNodes[i].nodeName === "BR") {
            msg += '\n';
        }
    }
    return msg;
}

function removeConnecting() {
    connectionStatus.style.display = "none";
    input.disabled = false;
    roominput.disabled = false;
}

function displayDisconnected() {
    connectionStatus.innerText = "Disconnected";
    connectionStatus.style.display = "block";
    input.disabled = true;
    roominput.disabled = true;
}

function connectWS() {
    clearInterval(timer);
    // first we want users to enter their names
    input.removeAttribute('disabled');
    status.textContent = statustext;
    timer = setInterval(() => {
        if(connection) {
            connection.send(JSON.stringify( {type: "ping", data: "ping"}));
        }
    }, 25000);

    if(reconnect) {
        clearInterval(reconnectionTimer);
        connection.send(JSON.stringify({type: 'reconnect', data: reconnectionID, lastMessage: lastMessageID, room: userRoom}))
    } else if(localStorage.getItem('randomID')) {
        connection.send(JSON.stringify({ 
            type: 'autoLogin',
            data: localStorage.getItem('randomID')
        }));
        loginContainer.style.display = "none";
    }
    reconnect = false;
};

window.WebSocket = window.WebSocket || window.MozWebSocket;

let statustext = 'Send a Message:';
if(isMobile.any) {
    // input.placeholder = 'Send a Message';
}

// setInterval(() => fetch("/ping"), 5 * 60000);

// if browser doesn't support WebSocket, just show some notification and exit
if (!window.WebSocket) {
    content.innerHTML('<p>Sorry, but your browser doesn\'t support WebSockets.</p>');
    input.style.visibility = "hidden";
    roominput.sytle.visibility = "hidden";
}

function contains(item, arr) {
    for(let i = 0; i < arr.length; i++) {
        if(arr[i] === item) {
            return true;
        }
    }
    return false;
}

let visible = true;
function handleVisibilityChange() {
    visible = !document[hidden];
}
document.addEventListener("visibilitychange", handleVisibilityChange, false);

// open connection
let connection = new WebSocket(window.location.href.replace('http', 'ws'));

function switchRoom(targetRoom, switchRoomName) {
    if(userRoom != targetRoom) {
        roomClicked = true;
        let element = document.getElementById(targetRoom + "notifications");
        element.innerText = "";
        element.style.display = "none";
        content.innerHTML = "";
        content.innerHTML = "";
        last_message_id = "";
        currentHistory = 0;
        content.innerHTML = "";
        let loaders = document.getElementsByClassName('messageLoader');
        for(let i = 0; i < loaders.length; i++) {
            loaders[i].remove();
        }
        let loader = document.createElement("div");
        loader.className = "loader";
        if(darkModeBool) {
            loader.classList.add("dark");
        }
        content.appendChild(loader);
        loading = true;
        previousDate = "";
        let p = document.createElement("p");
        p.id = "date0";
        content.appendChild(p);
        dateid = 1;
        connection.send(JSON.stringify( {type: "joinRoom", data: targetRoom}));
        if(roomElements.length > 0) {
            document.getElementById(userRoom).classList.remove("currentRoom");
        }
        userRoom = targetRoom;
        document.getElementById("current").innerText = switchRoomName;
        document.getElementById(userRoom).classList.add("currentRoom");
    }
}

function messageWS(message) {

    // try to parse JSON message. Because we know that the server always returns
    // JSON this should work without any problem but we should make sure that
    // the massage is not chunked or otherwise damaged.
    let json;
    try {
        json = JSON.parse(message.data);
    } catch (e) {
        console.log('This doesn\'t look like a valid JSON: ', message.data);
        return;
    }
    
    if (json.type === 'color') { // first response from the server with user's color
        myColor = json.data;
    } else if(json.type === 'name') {
        if(isMobile.any) {
            input.placeholder = 'Send a message';
        }
        roominput.disabled = false;
        myName = json.data;
        statustext = myName;
        status.textContent = statustext;
        status.classList.add(myColor);
        messageColor.classList.add(myColor);
    } else if (json.type === 'room') {
        input.focus();
        addRoom(json.data, json.id);
        // from now user can start sending messages
    } else if (json.type === 'history') { // entire message history
        // insert every single message to the chat window
        let sent = json.data;
        if(currentHistory === 0 && json.data.length > 0) {
            lastMessageID = json.data[0].messageId;
        }
        currentHistory += sent.length;
        let isScrolled = Math.abs((content.scrollTop + content.offsetHeight) - content.scrollHeight) < 5;
        if(sent.length === 0) {
            canLoad = false;
        } else {
            canLoad = true;
        }
        addHistory(sent, json.room, connection, isScrolled); //adds each history message to the content
        let loaders = document.getElementsByClassName('loader');
        for(let i = 0; i < loaders.length; i++) {
            loaders[i].remove();
        }
        loaders = document.getElementsByClassName('messageLoader');
        for(let i = 0; i < loaders.length; i++) {
            loaders[i].remove();
        }
        if(isScrolled) {
            content.scrollTop = content.scrollHeight;
        }
        for (let i=0; i < json.data.length; i++) {
            last_message_id = sent[i].userId;
        }
        if(json.data.length === 0) {
            last_message_id = "";
        }
        loading = false;
    } else if (json.type === 'message') { // it's a single message
        if (!isMobile.any() && Notification.permission === 'granted' && json.data.author !== myName && !visible) {
            let options = {
                icon: "/favicon.png",
                body: json.data.author + ': ' + json.data.data,

            }

            let sentRoomName = document.getElementById(json.data.Room).children[0].innerText;
            new Notification(sentRoomName, options);
        }
        input.removeAttribute('disabled'); // let the user write another message
        addMessage(json.data.author, json.data.data, json.data.color, new Date(json.data.time), json.data.Room, json.data.userId, connection, json.data.attachments, json.data.types, json.messageID);
        last_message_id = json.data.userId;
        currentHistory++;
    } else if(json.type === 'ping') {

    } else if(json.type === 'id') {
        id = json.data;
    } else if(json.type === "login") {
        if(json.status === "200") {
            const loginScreen = document.getElementById('loginContainer');
            loginScreen.style.display = 'none';
            reconnectionID = json.reconnectID;
            friendsList = json.friends;
            for(let i = 0; i < friendsList.length; i++) {
                addFriend(friendsList[i]);
            }
        }
        else if(json.status === '201') {
            const invalidAccount = document.getElementById('invalidAccount');
            invalidAccount.style.display = 'block';
        }
    } else if(json.type === 'loginKey') {
        localStorage.setItem('randomID', json.data);
    } else if(json.type === 'createAccount') {
        if(json.data === '200') {
            loginContainer.style.display = 'none';
        } else if(json.data === '201') {
            accountExists.style.display = 'block';
        }
    } else if(json.type === 'linkPreview') {
        let originalLink = decodeURIComponent(json.data[0]);
        let image = json.data[1];
        let publisher = json.data[2];
        let title = json.data[3];

        let isScrolled = Math.abs((content.scrollTop + content.offsetHeight) - content.scrollHeight) < 5;

        let links = document.getElementsByClassName(originalLink);

        for (let i = 0; i < links.length; i++) {
            let newElement = document.createElement('a');
            newElement.href = originalLink;
            newElement.target = '_blank';
            let oldElement = links[i];

            let overview = document.createElement('div');
            overview.classList.add('linkOverview');

            newElement.classList.add('linkPreview');
            
            let titleText = document.createElement('div');
            titleText.classList.add('titleText');
            if(title) {
                titleText.appendChild(document.createTextNode(title));
            } else {
                titleText.appendChild(document.createTextNode(originalLink));
            }
            overview.appendChild(titleText);

            if(publisher) {
                let publisherText = document.createElement('div');
                publisherText.classList.add('publisherText');
                publisherText.appendChild(document.createTextNode(publisher));
                overview.appendChild(publisherText);
            }

            if(image) {
                let img = document.createElement('img');
                img.src = image;
                img.classList.add('linkImage');
                newElement.appendChild(img);
            } else {
                overview.classList.add('standaloneOverview');
            }

            newElement.appendChild(overview);

            oldElement.replaceWith(newElement);

            if(isScrolled) {
                content.scrollTop = content.scrollHeight;
            }
        }

    } else if(json.type === "mostRecentMessages") {
        for(let i = 0; i < json.data.length; i++) {
            document.getElementById(json.data[i].Room + "lastSent").style.display = "inline-block";
            document.getElementById(json.data[i].Room + "lastSent").classList.remove('hidden');
            document.getElementById(json.data[i].Room + "author").innerText = json.data[i].author + ": ";
            if(json.data[i].data != '') {
                document.getElementById(json.data[i].Room + "lastMessage").innerText = json.data[i].data.replace(/\n+/g, " ");
            } else {
                document.getElementById(json.data[i].Room + "lastMessage").innerText = "Attachment";
            }
            ROOMS.prepend(document.getElementById(json.data[i].Room));
            twemoji.parse(document.getElementById(json.data[i].Room + "lastMessageText"));
        }
    } else if (json.type === 'attachments') {
        let msg = input.innerText;
        // send the message as ordinary text
        /\S/.test(msg);
        msg = emojify(input);
        connection.send(JSON.stringify({ type: "message", data: msg, room: userRoom, attachments: json.data, types: json.types}));
        let sendingAttachments = document.getElementsByClassName('attachmentPreview');
        sendingAttachments = Array.from(sendingAttachments);
        sendingAttachments = sendingAttachments.concat(Array.from(document.getElementsByClassName('imageContainer')));
        
        for(let i = 0; i < sendingAttachments.length; i++) {
            sendingAttachments[i].remove();
        }
        content.removeAttribute("style");
        input.classList.remove("attached");
        input.contentEditable = 'true';
        input.innerHTML = '';
    } else if(json.type === 'colorChange') {
        let messages = document.getElementsByClassName(json.id);
        for(let i = 0; i < messages.length; i++) {
            messages[i].classList.remove(json.oldColor);
            messages[i].classList.add(json.color);
        }
    } else if(json.type === 'missedMessages') {
        removeConnecting();
        for(let i = 0; i < json.data.length; i++) {
            addMessage(json.data[i].author, json.data[i].data, json.data[i].color, new Date(json.data[i].time), json.data[i].Room, json.data[i].userId, connection, json.data[i].attachments, json.data[i].types, json.data[i].messageId);;
        }
    } else if(json.type === 'joinRoom') {
        let element = document.createElement("p");
        element.className = "room";
        element.id = json.data;
        let textContainer = document.createElement("div");
        if(Array.isArray(json.name)) {
            let roomName = "";
            for(let i = 0; i < json.name.length; i++) {
                if(i != json.name.length - 1) {
                    roomName += json.name[i] + ", ";
                } else {
                    roomName += json.name[i];
                }
            }
            textContainer.appendChild(document.createTextNode(roomName));
        } else {
            textContainer.appendChild(document.createTextNode(json.name));
        }
        textContainer.classList.add("roomTextContainer");
        element.appendChild(textContainer);
        element.onclick = (() => {
            switchRoom(element.id, textContainer.innerText);
            mobileMenuContainer.classList.remove("showing");
        });
        ROOMS.prepend(element);
        let roomNotifications = document.createElement("div");
        roomNotifications.id = json.data + "notifications";
        roomNotifications.className = "roomCount";
        roomNotifications.style.display = "none";
        roomNotifications.appendChild(document.createTextNode(""));
        let lastSent = document.createElement("div");
        lastSent.id = json.data + "lastSent";
        lastSent.className = "lastSent";
        lastSent.appendChild(roomNotifications);
        let author = document.createElement("span");
        author.id = json.data + "author";
        author.className = "bold";
        lastSent.appendChild(author);
        let lastmessage = document.createElement("span");
        lastmessage.id = json.data + "lastMessage";
        lastmessage.className = "lastMessageText";
        lastSent.appendChild(lastmessage);
        lastSent.classList.add('hidden');
        element.appendChild(lastSent);
        roomElements.push(element);
        rooms.push(json.data);
    } else if(json.type === "joinedRooms") {
        let roomLoaders = document.getElementsByClassName('roomLoader');
        for(let i = 0; i < roomLoaders.length; i++) {
            roomLoaders[i].remove();
        }
        let globalRoomIndex = 0;
        for (let i = 0; i < json.data.length; i++) {
            addRoom(json.data[i].roomName, json.data[i].roomId, json.data[i].message, json.data[i].author);
            if(json.data[i].roomName === "global") {
                globalRoomIndex = i;
            }
        }
        if(roomElements.length > 0) {
            document.getElementById(userRoom).classList.remove("currentRoom");
        }
        userRoom = json.data[globalRoomIndex].roomId;
        document.getElementById("current").innerText = json.data[globalRoomIndex].roomName;
        document.getElementById(userRoom).classList.add("currentRoom");
    } else if(json.type === "emailToID") {
        let index = newRoomList.indexOf(json.data[0]);
        if(Array.isArray(json.data)) {
            let element = document.getElementById("friendPreview" + json.data[0]);
            newRoomList[index] = json.data[2];
            let text = element.children[0];
            text.innerText = json.data[1];
            updateFriend();
        } else {
            newRoomList.splice(index, 1);
            element = document.getElementById("friendPreview" + json.data);
            element.classList.add('invalid');
            element.children[1].classList.add('invalid');
        }
    } else if(json.type === 'friendRequests') {
        for(let i = 0; i < json.data.length; i++) {
            addFriendRequest(json.data[i]);
        }
    } else if(json.type === 'pendingFriends') {
        for(let i = 0; i < json.data.length; i++) {
            addPendingFriend(json.data[i]);
        } 
    } else if(json.type === 'newFriend') {
        let friend = {
            id: json.id,
            name: json.data
        };
        friendsList.push(friend);
        addFriend(friend);
    } else if(json.type === 'pendingFriend') {
        let friendJSON = {
            id: json.id,
            name: json.data,
            email: json.email
        }
        addPendingFriend(friendJSON);
    } else if(json.type === 'friendRequest') {
        let friend = {id: json.id, name: json.data}
        addFriendRequest(friend);
    } else {
        console.log('Invalid JSON Format: ', json);
    }
};

function addFriendRequest(user) {
    let friend = document.createElement('div');
    friend.id = user.id;
    friend.classList.add('friend');
    friend.classList.add('friendRequest');
    let text = document.createTextNode(user.name);
    friend.appendChild(text);
    let selectorContainer = document.createElement('span');
    selectorContainer.classList.add('friendSelectorContainer');
    let checkContainer = document.createElement('div');
    let check = document.createElement('div');
    check.classList.add("friendRequestCheck");
    check.onclick = () => {
        let friendID = friend.id;
        console.log(friendID);
        connection.send(JSON.stringify({type: "acceptedFriend", data: friendID}));
        friendRequestsContainer.removeChild(friend);
    }
    let checkPositionContainer = document.createElement('div');
    checkPositionContainer.classList.add('friendRequestCheckContainer');
    checkPositionContainer.appendChild(check);
    let xContainer = document.createElement('div');
    let x = document.createElement('img');
    x.classList.add("friendRequestX");
    x.src = '/x.svg';
    checkContainer.classList.add("smallIcon");
    checkContainer.appendChild(checkPositionContainer);
    xContainer.classList.add("smallIcon");
    xContainer.appendChild(x);
    selectorContainer.appendChild(xContainer);
    selectorContainer.appendChild(checkContainer);
    friend.appendChild(selectorContainer);
    friendRequestsContainer.appendChild(friend);
}

function addPendingFriend(user) {
    let friend = document.createElement('div');
    friend.id = user.id;
    friend.classList.add('friend');
    let text = document.createTextNode(user.name);
    friend.appendChild(text);
    pendingFriendsContainer.appendChild(friend);
}

connection.onopen = connectWS;

let reconnectionTimer;

function reconnectWS() {
        //attempt reconnection
        try{
            setTimeout(function () {
                reconnect = true;
                connectionStatus.innerText = 'Reconnecting'
                connection = new WebSocket(window.location.href.replace('http', 'ws'));

                connection.onclose = function () {
                    displayDisconnected();
                    reconnectWS();
                };

                connection.onmessage = messageWS;

                connection.onopen = connectWS;

            }, 1000);
        } catch {
            displayDisconnected();
            setTimeout(reconnectWS, 1000);
            // reconnectWS();
        }
};

connection.onclose = function () {
    displayDisconnected();
    reconnectWS();
};

connection.onmessage = messageWS;

/**
 * Send mesage when user presses Enter key
 */
friendInput.onkeydown = function(e) {
    if(e.key === "ArrowDown") {
        e.preventDefault();
        currentActiveVertical++;

        addActiveFriend(friendsContainer);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        currentActiveVertical--;

        addActiveFriend(friendsContainer);
    } else if(e.key === "Enter") {
        e.preventDefault();
        let inputValue = friendInput.innerText.substring(1, friendInput.innerText.length);
        if(currentActiveVertical >= 0) {
            friendsContainer.children.item(currentActiveVertical).click();
            friendInput.innerHTML = "&nbsp;";
            currentActiveVertical = -1;
            removeActive(friendsContainer);
        } else if(isValidEmail(inputValue)) {
            addFriendEmail(inputValue);
        }
    }
};

sendMessage = () => {
    if(attachments.length <= 0) {
        let msg = input.innerText;
        if (!msg) {
            return;
        }
        msg = emojify(input);
        // send the message as an ordinary text
        console.log(msg);
        if(/\S/.test(msg)) {
            console.log(msg);
            connection.send(JSON.stringify({ type: "message", data: msg, room: userRoom}));
            input.innerHTML = '';
        } else {
            input.innerHTML = '';
        }
        if (myName === false) {
            myName = msg;
        }
    } else {
        connection.send(JSON.stringify({
            type: 'attachmentLength',
            data: attachments.length,
            types: types
        }));
        for(let i = 0; i < attachments.length; i++) {
            connection.send(attachments[i]);
        }
        attachments = [];
        types = [];
        Index = 0;
        fileInput.value = '';
        input.contentEditable = 'false';
    }
}

input.onkeydown = function(e) {
    if (e.key === "Enter" && !e.shiftKey && !isMobile.any()) {
        e.preventDefault();
        sendMessage();
    }
};

input.addEventListener("input", function(e) {
    if(input.innerText === "\n") {
        input.innerText = "";
    }

    // let select = window.getSelection();

    let selection = document.getSelection();
    let selectStart = selection.anchorOffset;
    let selectNode = selection.anchorNode;
    let range = selection.getRangeAt(0).cloneRange();

    if(e.data && /\p{Extended_Pictographic}/ug.test(e.data)) {
        let textNodeIndex = Array.prototype.indexOf.call(input.childNodes, selectNode);
        twemoji.parse(input);
        let text;
        if(textNodeIndex + 1 === input.childNodes.length) { //if text is last element
            text = document.createTextNode("");
            input.append(text);
        } else {
            text = input.childNodes[textNodeIndex + 1]; //+1 for element after added emoji
            if(text.nodeName != "#text") {
                text = document.createTextNode("");
                input.insertBefore(text, input.childNodes[textNodeIndex + 2]); // +2 for element after text
            }
        }

        let index = 0; //guarenteed that index of cursor in text node after emoji is 0
        range.setStart(text, index);
        selection.removeAllRanges();
        selection.addRange(range);
    }
});


let hidden, visibilityChange; 
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
    hidden = "hidden";
    visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
}

function addRoom(room, id, message, author) {
    if(document.getElementById("current").innerHTML !== "") {
        content.innerHTML = "";
        let loader = document.createElement("div");
        loader.className = "loader";
        if(darkModeBool) {
            loader.classList.add("dark");
        }
        content.appendChild(loader);
        let p = document.createElement("p");
        p.id = "date0";
        content.appendChild(p);
        dateid = 1;
    }
    if(roomElements.length > 0) {
        document.getElementById(userRoom).classList.remove("currentRoom");
    }
    userRoom = id;
    document.getElementById("current").innerText = room;
    if(!contains(userRoom, rooms)) {
        let element = document.createElement("p");
        element.className = "room";
        element.id = id;
        let textContainer = document.createElement("div");
        textContainer.appendChild(document.createTextNode(room));
        
        textContainer.classList.add("roomTextContainer");
        element.appendChild(textContainer);
        element.onclick = (() => {
            switchRoom(element.id, textContainer.innerText);
            mobileMenuContainer.classList.remove("showing");
        });
        ROOMS.prepend(element);
        let roomNotifications = document.createElement("div");
        roomNotifications.id = userRoom + "notifications";
        roomNotifications.className = "roomCount";
        roomNotifications.style.display = "none";
        roomNotifications.appendChild(document.createTextNode(""));
        let lastSent = document.createElement("div");
        lastSent.id = userRoom + "lastSent";
        lastSent.className = "lastSent";
        lastSent.appendChild(roomNotifications);
        let author = document.createElement("span");
        author.id = userRoom + "author";
        author.className = "bold";
        lastSent.appendChild(author);
        let lastmessage = document.createElement("span");
        lastmessage.id = userRoom + "lastMessage";
        lastmessage.className = "lastMessageText";
        lastSent.appendChild(lastmessage);
        lastSent.classList.add('hidden');
        element.appendChild(lastSent);
        roomElements.push(element);
        rooms.push(userRoom);
    }
    if(message != undefined && author != undefined) {
        document.getElementById(id + "lastSent").style.display = "inline-block";
        document.getElementById(id + "lastSent").classList.remove('hidden');
        document.getElementById(id + "author").innerText = author + ": ";
        if(message != '') {
            document.getElementById(id + "lastMessage").innerText = message.replace(/\n+/g, " ");
        } else {
            document.getElementById(id + "lastMessage").innerText = "Attachment";
        }
    }

    if(!roomClicked) {
        ROOMS.scrollTop = document.getElementById(userRoom).offsetTop - ROOMS.offsetTop;
    }
    roomClicked = false;
    document.getElementById(userRoom).classList.add("currentRoom");
}

const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=-_|!:,.;]*[-A-Z0-9+&@#\/%=-_|])/ig;

const attachment = (container, attachment, type) => {
    let attachmentContainer = document.createElement('div');
    attachmentContainer.className = "attachmentContainer";
    let background = document.createElement('a');

    background.className = "attachmentBackground";
    background.setAttribute("download", type);
    background.href = attachment;
 
    let foreground = document.createElement('div');
    let foregroundText = document.createElement('div');
    let fileImage = document.createElement('img');
    fileImage.src = "/file.svg";
    fileImage.className = "fileImage";
    foreground.appendChild(fileImage);
    let text = document.createTextNode(type);
    foregroundText.appendChild(text);
    foregroundText.className = "foregroundText";
    foreground.className = "attachmentForeground"
    foreground.appendChild(foregroundText);
    attachmentContainer.appendChild(foreground);

    let downloadImage = document.createElement('img');
    downloadImage.src = "/download.svg";
    downloadImage.className = "downloadImage";
    background.appendChild(downloadImage);

    attachmentContainer.appendChild(background);

    container.appendChild(attachmentContainer);
}

const linkify = (container, text, connection) => {
    let startIndex = 0;
    let currentLink = null;

    while(currentLink = urlRegex.exec(text)) {
        container.appendChild(document.createTextNode(text.slice(startIndex, currentLink.index)));
        startIndex = currentLink.index + currentLink[0].length;
        
        const link = document.createElement('a');
        link.href = currentLink[0];
        link.target = '_blank';
        link.innerText = currentLink[0];
        link.classList.add(currentLink[0]);

        let isImage = ('.' + currentLink[0].split('.').slice(-1)[0]).match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image

        if(!isImage) {
            connection.send(JSON.stringify({type: 'linkPreview', data: currentLink[0]}));
        } else {
            connection.send(JSON.stringify({type: 'imagePreview', data: currentLink[0]}));
        }

        container.appendChild(link);
    }
    container.appendChild(document.createTextNode(text.slice(startIndex)));
}

const createDateSeparator = (date) => {
    let dateContainer = document.createElement('div');
    dateContainer.classList.add("dateContainer");
    let textContainer = document.createElement('div');
    textContainer.classList.add("separatorText");
    let text = document.createTextNode(date);
    let line = document.createElement('div');
    line.classList.add("line");
    dateContainer.appendChild(line);
    textContainer.appendChild(text);
    dateContainer.appendChild(textContainer);
    line = document.createElement('div');
    line.classList.add("line");
    dateContainer.appendChild(line);

    return dateContainer;
}

let dateid = 1;
let last_message_time = 0;
let time_differential = 30 * 60 * 1000; //30 minutes
function addMessage(author, message, color, dt, room, sentid, connection, attachments, types, messageID) {
    let isScrolled = Math.abs((content.scrollTop + content.offsetHeight) - content.scrollHeight) < 5;
    lastMessageID = messageID;
    if(userRoom === room) {
        let name = true;
        let message_class = sentid;
        let time_class = '';
        let time_id = "date" + dateid;
        let title_class = "";
        let message_time = dt.getTime();
        let readableDate = dt.toDateString();
        if (darkModeBool) {
            time_class = time_class + " dark";
            title_class = title_class + " dark";
            message_class = message_class + " dark";
        }
        if (sentid === id) {
            message_class = message_class + " my_message message "
            time_class = time_class + " my_message";
            title_class = title_class + " my_message";
            isScrolled = true;
        } else {
            message_class = message_class + " other_message message ";
            time_class = time_class + " other_message";
            title_class = title_class + " other_message";
        }

        if (last_message_id === sentid && message_time - last_message_time <= time_differential) {
            message_class = message_class + " grouped";
            name = false;
            document.getElementById('date' + (dateid-1)).remove();
        } else {
            name = true;
        }
        last_message_time = message_time;

        if(readableDate !== previousDate) {
            let dateContainer = createDateSeparator(readableDate);
            content.appendChild(dateContainer);
        }
        previousDate = readableDate;
        
        if (name === true) {
            let el = document.createElement("p");
            let textnode = document.createTextNode(author);
            el.appendChild(textnode);
            el.className = title_class;
            el.classList.add('name');
            content.appendChild(el);

            let p = document.createElement("p");
            if(message != "" && message) {
                linkify(p, message, connection);
                twemoji.parse(p);
                if(attachments) {
                    for(let i = 0; i < attachments.length; i++) {
                        let isImage = types[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                        if(isImage) {
                            let img = new Image();
                            img.onload = () => {
                                if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                    img.classList.add('square');
                                } else if(img.naturalHeight >= img.naturalWidth) {
                                    img.classList.add('vertical');
                                } else {
                                    img.classList.add('horizontal');
                                }
                            }
                            img.classList = 'image';
                            img.src = attachments[i];
                            img.setAttribute("download", types[i]);
                            p.appendChild(img);
                        } else {
                            attachment(p, attachments[i], types[i]);
                        }
                    }
                }
            } else {
                for(let i = 0; i < attachments.length; i++) {
                    let isImage = types[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                    if(isImage) {
                        let img = new Image();
                        img.onload = () => {
                            if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                img.classList.add('square');
                            } else if(img.naturalHeight >= img.naturalWidth) {
                                img.classList.add('vertical');
                            } else {
                                img.classList.add('horizontal');
                            }
                        }
                        img.classList = 'image';
                        img.src = attachments[i];
                        img.setAttribute("download", types[i]);
                        p.appendChild(img);
                    } else {
                        attachment(p, attachments[i], types[i]);
                    }
                }
            }
            p.className = message_class;
            p.classList.add(color);
            content.appendChild(p);
            // content.appendChild(document.createElement("br"));
        } else {
            let p = document.createElement("p");
            p.className = message_class;
            p.classList.add(color);
            if(message != "" && message) {
                linkify(p, message, connection);
                twemoji.parse(p);
                if(attachments) {
                    for(let i = 0; i < attachments.length; i++) {
                        let isImage = types[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                        if(isImage) {
                            let img = new Image();
                            img.onload = () => {
                                if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                    img.classList.add('square');
                                } else if(img.naturalHeight >= img.naturalWidth) {
                                    img.classList.add('vertical');
                                } else {
                                    img.classList.add('horizontal');
                                }
                            }
                            img.classList = 'image';
                            img.src = attachments[i];
                            img.setAttribute("download", types[i]);
                            p.appendChild(img);
                        } else {
                            attachment(p, attachments[i], types[i]);
                        }
                    }
                }
            } else {
                for(let i = 0; i < attachments.length; i++) {
                    let isImage = types[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                    if(isImage) {
                        let img = new Image();
                        img.onload = () => {
                            if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                img.classList.add('square');
                            } else if(img.naturalHeight >= img.naturalWidth) {
                                img.classList.add('vertical');
                            } else {
                                img.classList.add('horizontal');
                            }
                        }
                        img.classList = 'image';
                        img.src = attachments[i];
                        img.setAttribute("download", types[i]);
                        p.appendChild(img);
                    } else {
                        attachment(p, attachments[i], types[i]);
                    }
                }
            }
            content.appendChild(p);
            // content.appendChild(document.createElement("br"));
            if(isScrolled) {
                content.scrollTop = content.scrollHeight;
            }
        }
        let p = document.createElement("p");
        let time = (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
        let tn = document.createTextNode(time);
        p.className = time_class;
        p.id = time_id;
        p.appendChild(tn);
        content.appendChild(p);
        if(isScrolled) {
            content.scrollTop = content.scrollHeight;
        }
        dateid++;
    } else {
        let element = document.getElementById(room + "notifications");
        if(element.innerText === "") {
            element.innerText = 1;
            element.style.display = "inline-block";
        } else {
            element.innerText = +element.innerText + 1;
        }
    }
    document.getElementById(room + "lastSent").style.display = "inline-block";
    document.getElementById(room + "lastSent").classList.remove('hidden');
    document.getElementById(room + "author").innerText = author + ": ";
    if(message != "") {
        document.getElementById(room + "lastMessage").innerText = message.replace(/\n+/g, " ");
    } else {
        document.getElementById(room + "lastMessage").innerText = "Attachment";
    }
    twemoji.parse(document.getElementById(room + "lastMessage"));
    ROOMS.prepend(document.getElementById(room));
}

let history_last_message_id = '';
let history_last_message_time = 0;
function addHistory(messages, room, connection, isScrolled) {
    if(messages.length > 0) {
        let historyBlock = document.createElement('div');
        if(darkModeBool) {
            historyBlock.classList.add('dark');
        }
        historyBlock.classList.add('history');
        let historydateid = 0;
        messages.reverse();
        let previousDateHistory = "";
        for(let i = 0; i < messages.length; i++) {
            let author = messages[i].author;
            let message = messages[i].data;
            let color = messages[i].color;
            let dt = new Date(messages[i].time);
            let readableDate = dt.toDateString();
            let sentid = messages[i].userId;
            let historyAttachments = messages[i].attachments;
            let historyTypes = messages[i].types;
            if(message || (historyAttachments && historyTypes)) {
                if(readableDate !== previousDateHistory) {
                    let dateContainer = createDateSeparator(readableDate);
                    if(sentid === id) {
                        dateContainer.classList.add('my_message');
                    } else {
                        dateContainer.classList.add('other_message');
                    }
                    historyBlock.appendChild(dateContainer);
                }
                previousDateHistory = readableDate;
                if(userRoom === room) {
                    let name = true;
                    let message_class = sentid;
                    let time_class = '';
                    let time_id = "date" + historydateid;
                    let title_class = "";
                    let message_time = dt.getTime();
                    let displayTime = false;
                    if (darkModeBool) {
                        time_class = time_class + " dark";
                        title_class = title_class + " dark";
                        message_class = message_class + " dark";
                    }
                    if (sentid === id) {
                        message_class = message_class + " my_message message "
                        time_class = time_class + " my_message";
                        title_class = title_class + " my_message";
                    } else {
                        message_class = message_class + " other_message message ";
                        time_class = time_class + " other_message";
                        title_class = title_class + " other_message";
                    }
                    if (history_last_message_id === sentid && message_time - history_last_message_time <= time_differential) {
                        message_class = message_class + " grouped";
                        name = false;
                    } else {
                        name = true;
                    }
                    if(i === 0) {
                        name = true;
                    }
                    if(i + 1 < messages.length) {
                        displayTime = !(messages[i].userId == messages[i+1].userId) || messages[i+1].time - message_time > time_differential;
                    } else {
                        displayTime = true;
                    }
                    history_last_message_time = message_time;
                    history_last_message_id = sentid;
                    if (name === true) {
                        let el = document.createElement("p");
                        let textnode = document.createTextNode(author);
                        el.appendChild(textnode);
                        el.className = title_class;
                        el.classList.add('name');
                        historyBlock.appendChild(el);

                        let p = document.createElement("p");
                        if(message != "" && message) {
                            linkify(p, message, connection);
                            twemoji.parse(p);
                            if(historyAttachments) {
                                for(let i = 0; i < historyAttachments.length; i++) {
                                    let isImage = historyTypes[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                                    if(isImage) {
                                        let img = new Image();
                                        img.onload = () => {
                                            if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                                img.classList.add('square');
                                            } else if(img.naturalHeight >= img.naturalWidth) {
                                                img.classList.add('vertical');
                                            } else {
                                                img.classList.add('horizontal');
                                            }
                                            if(isScrolled) {
                                                content.scrollTop = content.scrollHeight;
                                            }
                                        }
                                        img.classList = 'image';
                                        img.src = historyAttachments[i];
                                        img.setAttribute("download", historyTypes[i]);
                                        p.appendChild(img);
                                    } else {
                                        attachment(p, historyAttachments[i], historyTypes[i]);
                                    }
                                }
                            }
                        } else {
                            for(let i = 0; i < historyAttachments.length; i++) {
                                let isImage = historyTypes[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                                if(isImage) {
                                    let img = new Image();
                                    img.onload = () => {
                                        if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                            img.classList.add('square');
                                        } else if(img.naturalHeight >= img.naturalWidth) {
                                            img.classList.add('vertical');
                                        } else {
                                            img.classList.add('horizontal');
                                        }
                                        if(isScrolled) {
                                            content.scrollTop = content.scrollHeight;
                                        }
                                    }
                                    img.classList = 'image';
                                    img.src = historyAttachments[i];
                                    img.setAttribute("download", historyTypes[i]);
                                    p.appendChild(img);
                                } else {
                                    attachment(p, historyAttachments[i], historyTypes[i]);
                                }
                            }
                        }
                        p.className = message_class;
                        p.classList.add(color);
                        historyBlock.appendChild(p);
                        // historyBlock.appendChild(document.createElement("br"));
                    } else {
                        let p = document.createElement("p");
                        p.className = message_class;
                        p.classList.add(color);
                        if(message != "" && message) {
                            linkify(p, message, connection);
                            twemoji.parse(p);
                            if(historyAttachments && historyTypes) {
                                for(let i = 0; i < historyAttachments.length; i++) {
                                    let isImage = historyTypes[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                                    if(isImage) {
                                        let img = new Image();
                                        img.onload = () => {
                                            if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                                img.classList.add('square');
                                            } else if(img.naturalHeight >= img.naturalWidth) {
                                                img.classList.add('vertical');
                                            } else {
                                                img.classList.add('horizontal');
                                            }
                                            if(isScrolled) {
                                                content.scrollTop = content.scrollHeight;
                                            }
                                        }
                                        img.classList = 'image';
                                        img.src = historyAttachments[i];
                                        img.setAttribute("download", historyTypes[i]);
                                        p.appendChild(img);
                                    } else {
                                        attachment(p, historyAttachments[i], historyTypes[i]);
                                    }
                                }
                            }
                        } else {
                            for(let i = 0; i < historyAttachments.length; i++) {
                                let isImage = historyTypes[i].match(/\.(jpe?g|png|gif)$/i); //splits link by . then gets the last item of the resulting array and then checks to see if it is a valid image
                                if(isImage) {
                                    let img = new Image();
                                    img.onload = () => {
                                        if(img.naturalHeight / img.naturalWidth < 1.5 && img.naturalWidth / img.naturalHeight < 1.5) {
                                            img.classList.add('square');
                                        } else if(img.naturalHeight >= img.naturalWidth) {
                                            img.classList.add('vertical');
                                        } else {
                                            img.classList.add('horizontal');
                                        }
                                        if(isScrolled) {
                                            content.scrollTop = content.scrollHeight;
                                        }
                                    }
                                    img.classList = 'image';
                                    img.src = historyAttachments[i];
                                    img.setAttribute("download", historyTypes[i]);
                                    p.appendChild(img);
                                } else {
                                    attachment(p, historyAttachments[i], historyTypes[i]);
                                }
                            }
                        }
                        historyBlock.appendChild(p);
                        // historyBlock.appendChild(document.createElement("br"));
                    }
                    if(displayTime) {
                        let p = document.createElement("p");
                        let time = (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
                        let tn = document.createTextNode(time);
                        p.className = time_class;
                        p.appendChild(tn);
                        historyBlock.appendChild(p);
                        historydateid++;
                    }
                }
            }
        }
        content.prepend(historyBlock);
        content.scrollTop = historyBlock.offsetHeight;
    }
}