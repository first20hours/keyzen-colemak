import './index.html';
import { Session } from 'meteor/session'

var data = {};
data.chars = " ntesiroahdjglpufywqbkvmcxz1234567890'\",.!?:;/@$%&#*()_ABCDEFGHIJKLMNOPQRSTUVWXYZ~+-={}|^<>`[]\\";
data.consecutive = 10;
data.word_length = 7;

$(document).ready(function() {
    if (localStorage.data != undefined) {
        load();
        render();
    }
    else {
        set_level(1);
    }
    $(document).keypress(keyHandler);
});


const set_level = l => {
    data.in_a_row = {};
    for(var i = 0; i < data.chars.length; i++) {
        data.in_a_row[data.chars[i]] = data.consecutive;
    }
    data.in_a_row[data.chars[l]] = 0;
    data.level = l;
    data.word_index = 0;
    data.word_errors = {};
    data.word = generate_word();
    data.keys_hit = "";
    save();
    render();
};


const keyHandler = e => {
    var key = String.fromCharCode(e.which);
    if (data.chars.indexOf(key) > -1){
        e.preventDefault();
    }
    data.keys_hit += key;
    if(key == data.word[data.word_index]) {
        data.in_a_row[key] += 1;
        if (Session.get("sound") === "on") {
            (new Audio("click.wav")).play();
        }
    }
    else {
        data.in_a_row[data.word[data.word_index]] = 0;
        data.in_a_row[key] = 0;
        if (Session.get("sound") === "on") {
            (new Audio("clack.wav")).play();
        }
        data.word_errors[data.word_index] = true;
    }
    data.word_index += 1;
    if (data.word_index >= data.word.length) {
        if(get_training_chars().length == 0) {
            level_up();
        }
        data.word = generate_word();
        data.word_index = 0;
        data.keys_hit = "";
        data.word_errors = {};
    }
    render();
    save();
};


const level_up = () => {
    if (data.level + 1 <= data.chars.length - 1) {
        if (Session.get("sound") === "on") {
            (new Audio('ding.wav')).play();
        }
    }
    l = Math.min(data.level + 1, data.chars.length);
    set_level(l);
};


const save = () => {
    localStorage.data = JSON.stringify(data);
};


const load = () => {
    data = JSON.parse(localStorage.data);
};


const render = () => {
    render_level();
    render_word();
    render_level_bar();
};


const render_level = () => {
    var chars = "<span id='level-chars-wrap'>";
    var level_chars = get_level_chars();
    var training_chars = get_training_chars();
    for (var c in data.chars) {
        if(training_chars.indexOf(data.chars[c]) != -1) {
            chars += "<span style='color: #F00' onclick='set_level(" + c + ");'>"
        }
        else if (level_chars.indexOf(data.chars[c]) != -1) {
            chars += "<span style='color: #000' onclick='set_level(" + c + ");'>"
        }
        else {
            chars += "<span style='color: #AAA' onclick='set_level(" + c + ");'>"
        }
        if (data.chars[c] == ' ') {
            chars += "&#9141;";
        }
        else {
            chars += data.chars[c];
        }
        chars += "</span>";
    }
    chars += "</span>";
    $("#level-chars").html(chars);
};


const render_level_bar = () => {
    training_chars = get_training_chars();
    if(training_chars.length == 0) {
        m = data.consecutive;
    }
    else {
        m = 1e100;
        for(c in training_chars) {
            m = Math.min(data.in_a_row[training_chars[c]], m);
        }
    }
    m = Math.floor($('#level-chars-wrap').innerWidth() * Math.min(1.0, m / data.consecutive));
    $('#next-level').css({'width': '' + m + 'px'});

};

const render_word = () => {
    var word = "";
    for (var i = 0; i < data.word.length; i++) {
        sclass = "normalChar";
        if (i > data.word_index) {
            sclass = "normalChar";
        }
        else if (i == data.word_index) {
            sclass = "currentChar";
        }
        else if(data.word_errors[i]) {
            sclass = "errorChar";
        }
        else {
            sclass = "goodChar";
        }
        word += "<span class='" + sclass + "'>";
        if(data.word[i] == " ") {
            word += "&#9141;"
        }
        else {
            word += data.word[i];
        }
        word += "</span>";
    }
    var keys_hit = "<span class='keys-hit'>";
    for(var d in data.keys_hit) {
        if (data.keys_hit[d] == ' ') {
            keys_hit += "&#9141";
        }
        else {
            keys_hit += data.keys_hit[d];
        }
    }
    for(var i = data.word_index; i < data.word_length; i++) {
        keys_hit += "&nbsp;";
    }
    keys_hit += "</span>";
    $("#word").html(word + "<br>" + keys_hit);
};


const generate_word = () => {
    word = '';
    for(var i = 0; i < data.word_length; i++) {
        c = choose(get_training_chars());
        if(c != undefined && c != word[word.length-1]) {
            word += c;
        }
        else {
            word += choose(get_level_chars());
        }
    }
    return word;
};


const get_level_chars = () => {
    return data.chars.slice(0, data.level + 1).split('');
};

const get_training_chars = () => {
    var training_chars = [];
    var level_chars = get_level_chars();
    for(var x in level_chars) {
        if (data.in_a_row[level_chars[x]] < data.consecutive) {
            training_chars.push(level_chars[x]);
        }
    }
    return training_chars;
};

const choose = a => {
    return a[Math.floor(Math.random() * a.length)];
};


Template.start_over_button.events({
    'click #start-over-button'() {
        set_level(1);
        // console.log("clicked start over")
    }
});


Template.start_from_select.events({
    'submit form'(e) {
        e.preventDefault();

        const selectedValue = parseInt(e.target.startFromSelect.value);
        // console.log("selected value:", selectedValue);

        set_level(selectedValue);
    }
});


Session.setDefault("finger-position-image-visibility", "shown");
Template.finger_position_image_button.events({
    'click #finger-position-image-button'(e) {
        if (Session.get("finger-position-image-visibility") === "shown") {
            $("#finger-position-image").hide();
            Session.set("finger-position-image-visibility", "hidden");
        } else {
            $("#finger-position-image").show();
            Session.set("finger-position-image-visibility", "shown");
        }
    }
});


Session.setDefault("sound", "on");
Template.sound_button.events({
    'click #sound-button'(e) {
        if (Session.get("sound") === "on") {
            Session.set("sound", "off");
        } else {
            Session.set("sound", "on");
        }
    }
});
