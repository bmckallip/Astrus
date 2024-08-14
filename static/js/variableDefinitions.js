const roomBar = document.getElementById('rooms');
const toggle = document.getElementById('mobileMenuContainer');
const settings = document.getElementById('settingsBlock')
const settingsMenu = document.getElementById('settingsContainer')
const settingsBackground = document.getElementById('settingsBackground');
const settingArr = document.getElementsByClassName('switch');
const sliders = document.getElementsByClassName('slider');
const darkMode = document.getElementById('darkMode');
const colors = document.getElementsByClassName('colors');
const messageColor = document.getElementById('messageColor');
const loginButton = document.getElementById('login');
const createButton = document.getElementById('create');
const loginContainer = document.getElementById('loginContainer');
const inputContainer = document.getElementById('loginInputsContainer');
const create = document.getElementById('createElementsContainer');
const usernameInput = document.getElementById('UNBox');
const passwordInput = document.getElementById('PWBox');
const newUsername = document.getElementById('emailPromptInput');
const newPassword = document.getElementById('passwordPromptInput');
const newPasswordConf = document.getElementById('passwordConfPromptInput');
const newScreenName = document.getElementById('namePromptInput');
const accountSubmit = document.getElementById('createSubmit');
const rememberMe = document.getElementById("rememberMe");
const invalidEmail = document.getElementById('invalidEmail');
const passwordNotMatched = document.getElementById('PasswordNotMatched');
const accountExists = document.getElementById('accountExists');
const accountContainer = document.getElementById('accountContainer');
const account = document.getElementById('profile');
const logOutBox = document.getElementById('logOut');
const allValuesReq = document.getElementById('allValuesReq');
const noLoginProvided = document.getElementById('allValsReq');
const attach = document.getElementById('addImage');
const fileInput = document.getElementById('fileInput');
const settingsClose = document.getElementById('settingsCloseButton');
const roomsTab = document.getElementById('roomsTab');
const friendsTab = document.getElementById('friendsTab');
const roomTitle = document.getElementById('Room_Title');
const roomContainer = document.getElementById('Room_Container');
const addFriendIcon = document.getElementById('addFriend');
const addFriendImage = document.getElementById('addFriendIcon');
const friendsSearch = document.getElementById('friendsSearch');
const roomSearchIcon = document.getElementById('roomSearchIcon');
const roomSubmit = document.getElementById('friendsSubmit');
const sendContainer = document.getElementById('sendContainer');
const addFriendButton = document.getElementById('addFriendButton');
const addFriendGraphic = document.getElementById('addFriendGraphic');
const friendBackground = document.getElementById('friendBackground');
const addFriendInput = document.getElementById('addFriendInput');
const friendRequestsContainer = document.getElementById('friendRequestsContainer');
const pendingFriendsContainer = document.getElementById('pendingFriendsContainer');
let content = document.getElementById('content');
let previousDate = "";
let darkModeBool = false;
let loading = false;
let canLoad = true;

function isValidEmail(email) { 
    if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)) {
        return true;
    }
        return false;
}