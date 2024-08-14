const friendPreviewContainer = document.getElementById("friendPreviewContainer");
const friendShape = document.getElementById("friendShape");
const mirror = document.getElementById("mirror");
const searchContainer = document.getElementById('searchContainer');
let newRoomList = [];
let currentActiveVertical = -1;
let nameIndex = null;
let friendInputFocus = false;

friendInput.addEventListener("focus", () => {
    friendInputFocus = true;
});

friendInput.addEventListener("blur", () => {
    friendInputFocus = false;
});

addFriendButton.onclick = () => {
    addFriendGraphic.style.display = "block";
    if(/^\n?$/.test(addFriendInput.innerText)) {
        addFriendInput.classList.add('empty');
    } else {
        addFriendInput.classList.remove('empty');
    }
}

friendBackground.onclick = () => {
    addFriendGraphic.style.display = "none";
}

document.addEventListener("selectionchange", e => {
    let selection = document.getSelection();
    let selectStart = selection.anchorOffset;
    let selectEnd = selection.focusOffset;

    if(selectStart === 0 && friendInputFocus) {
        let range = selection.getRangeAt(0).cloneRange();
        let startNode = friendInput.childNodes[0];

        range.setStart(startNode, 1);
        selection.removeAllRanges();
        selection.addRange(range);
    } else if(selectEnd === 0 && friendInputFocus) {
        let endNode = friendInput.childNodes[0];

        selection.extend(endNode, 1);
    }
});

document.addEventListener("keydown", (e) => {
    let selection = document.getSelection();
    let selectStart = selection.anchorOffset;

    let isCollapsed = selection.isCollapsed;

    if(isCollapsed && (friendInputFocus || nameIndex != null)) {
        if(selectStart === 0 || (selectStart === 1 && friendInput.innerText[0] === '\u00A0')) {
            
            let friendElementList = document.getElementsByClassName("friendPreview");
            if(e.key === "ArrowLeft") {
                if(friendElementList.length > 0) {
                    if(!nameIndex && nameIndex != 0) {
                        nameIndex = friendElementList.length - 1;
                        friendInput.blur();
                        searchContainer.classList.add('active');
                    } else {
                        if(nameIndex > 0) {
                            friendElementList[nameIndex].classList.remove('active');
                            nameIndex--;
                        }
                    }

                    if(nameIndex >= 0) {
                        friendElementList[nameIndex].classList.add('active');
                    }
                } else if(selectStart === 1) {
                    e.preventDefault();
                }
            } else if(e.key === "ArrowRight") {
                if(nameIndex != null) {
                    friendElementList[nameIndex].classList.remove('active');
                    nameIndex++;
                    if(nameIndex < friendElementList.length) {
                        friendElementList[nameIndex].classList.add('active');
                    } else {
                        // friendElementList[friendElementList.length - 1].classList.remove('active');
                        nameIndex = null;
                        friendInput.focus();
                        let startNode = friendInput.childNodes[0];
                        let range = document.createRange();
                        range.setStart(startNode, 1);
                        range.setEnd(startNode, 1);
                        let selection = document.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        e.preventDefault();
                    }
                }
            } else if(e.key === "Backspace" || e.key === "Delete") {
                if(nameIndex != null) {
                    friendElementList[nameIndex].remove();
                    newRoomList.splice(nameIndex, 1);
                    if(nameIndex < friendElementList.length) {
                        friendElementList[nameIndex].classList.add('active');
                    } else {
                        nameIndex = null;
                        friendInput.focus();
                        e.preventDefault();
                        if(newRoomList.length === 0) {
                            friendInput.classList.add('empty');
                            roomSubmit.classList.add('disabled');
                        }
                    }
                } else if(friendElementList.length > 0 && e.key != "Delete") {
                    nameIndex = friendElementList.length - 1;
                    friendInput.blur();
                    searchContainer.classList.add('active');
                    friendElementList[nameIndex].classList.add('active');
                }
                updateFriend();
            }
        } 
    }
});

function updateFriend() {
    const names = document.querySelectorAll(".friendPreview");
    const lastName = names[names.length - 1];
    if(lastName) {
        friendInputContainer.style.height = 0;
        roominput.style.height = "";

        let containerHeight = roominput.scrollHeight;
        friendInputContainer.style.height = containerHeight + "px";
        roominput.style.height = containerHeight + "px";

        const { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = lastName;
        const { paddingTop, marginTop, marginRight } = window.getComputedStyle(lastName);

        const n = parseFloat;
        const restrictX = x + width + n(marginRight);
        const restrictY = y - n(marginTop);
        const restrictBottom = y + height;

        if(/^\n?$/.test(friendInput.innerText)) {
            friendInput.innerHTML = "&nbsp;";
            friendInput.classList.add('empty');
            let startNode = friendInput.childNodes[0];
            let range = document.createRange();
            range.setStart(startNode, 1);
            range.setEnd(startNode, 1);
            let selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        friendShape.style.shapeOutside = `polygon(0 0, 100% 0, 100% ${restrictY}px, ${restrictX}px ${restrictY}px, ${restrictX}px ${restrictBottom}px, 0 ${restrictBottom}px, 0 0)`;
        friendInputContainer.style.height = 0;
        roominput.style.height = "";

        containerHeight = roominput.scrollHeight;
        friendInputContainer.style.height = containerHeight + "px";
        roominput.style.height = containerHeight + "px";
        
    } else {
        friendShape.style.shapeOutside = 'polygon(0 0, 0 0, 0 0, 0 0)';
        friendInputContainer.style.height = 0;
        roominput.style.height = "";

        let containerHeight = roominput.scrollHeight;
        friendInputContainer.style.height = containerHeight + "px";
        roominput.style.height = containerHeight + "px";
        // friendInputContainer.style.height = roominput.scrollHeight + "px";
    }
}

function addActiveFriend(x) {
    removeActive(x);
    if (currentActiveVertical >= x.children.length) currentActiveVertical = 0;
    if (currentActiveVertical < 0) currentActiveVertical = -1;
    /*add class "autocomplete-active"*/
    if(currentActiveVertical >= 0) {
        x.children.item(currentActiveVertical).classList.add("autocomplete-active");
    }
}

function removeActive(active) {
    active.classList.remove("autocomplete-active");
}

function addFriendPreview(id, name) {
    newRoomList.push(id);
    friendInput.classList.remove('empty');

    let element = document.createElement("div");
    element.classList.add("friendPreview");
    element.contentEditable = "false";
    element.id = "friendPreview" + id;
    let textContainer = document.createElement("div");
    textContainer.classList.add("friendTextContainer");
    textContainer.innerText = name;
    element.append(textContainer);

    let close = document.createElement("div");
    let closeText = document.createElement("div");
    closeText.classList.add("closeButtonText");
    let text = document.createTextNode("+");
    close.classList.add("friendCloseButton");
    closeText.append(text);
    close.append(closeText);
    close.onclick = (e) => {
        let parent = e.target.parentElement.parentElement.parentElement;
        let indexOfElement = Array.prototype.indexOf.call(parent.children, e.target.parentElement.parentElement) - 1;
        e.target.parentElement.parentElement.remove();
        newRoomList.splice(indexOfElement, 1);
        if(newRoomList.length === 0) {
            friendInput.classList.add('empty');
            roomSubmit.classList.add('disabled');
        }
        updateFriend();
    }
    element.append(close);
    element.onclick = (e) => {
        e.target.parentElement;
    }

    roominput.insertBefore(element, mirror);

    mirror.innerHTML = friendInput.innerHTML;

    updateFriend();

    roomSubmit.classList.remove('disabled');
}

function addFriendRoom(id) {
    let friendElement = document.getElementById(id);
    let name = friendElement.innerText;

    addFriendPreview(id, name);
}

function resetFriends() {
    newRoomList = [];
    let friends = document.getElementsByClassName('friendPreview');
    let length = friends.length;
    for(let i = 0; i < length; i++) {
        friends[0].remove();
    }
    updateFriend();
    friendInput.innerHTML = '&nbsp';
    friendInput.classList.add('empty');
    roomSubmit.classList.add('disabled');
}

function addFriendEmail(email) {
    friendInput.innerHTML = "&nbsp;";
    let elements = document.getElementsByClassName('friend');
    for(let i = 0; i < elements.length; i++) {
        elements[i].classList.remove('hidden');
    }
    addFriendPreview(email, email);
    connection.send(JSON.stringify({type: "emailToID", data: email}));
}

addFriendInput.addEventListener("blur", function() {
    if(/^\n?$/.test(addFriendInput.innerText)) {
        addFriendInput.classList.add('empty');
    }
});

addFriendInput.addEventListener("focus", function() {
    if(/^\n?$/.test(addFriendInput.innerText)) {
        addFriendInput.classList.add('empty');
    }
});

addFriendInput.addEventListener("input", function(e) {
    if(/^\n?$/.test(addFriendInput.innerText)) {
        addFriendInput.innerHTML = "";
        addFriendInput.classList.add('empty');
    } else {
        addFriendInput.classList.remove('empty');
    }

    if(e.key === 'Enter' && isValidEmail(addFriendInput.innerText)) {
        newFriendRequest(addFriendInput.innerText);
    }
});

function newFriendRequest(email) {
    addFriendInput.innerHTML = "";
    addPendingFriend(email);

    connection.send(JSON.stringify({type: "friendRequest", data: email}));
}