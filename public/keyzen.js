var data = {};
data.chars = " ntesiroahdjglpufywqbkvmcxz1234567890'\",.!?:;/@$%&#*()_ABCDEFGHIJKLMNOPQRSTUVWXYZ~+-={}|^<>`[]\\";
data.consecutive = 10;
data.word_length = 7;

var colemak_rows = [
    "`1234567890-=",
    "qwfpgjluy;[]\\",
    "arstdhneio'",
    "zxcvbkm,./"
];
var colemak_home = "arstneio";
var stats = {};
var stats_limit = 10;
var streak = {current: 0, best: 0};
var focus_weak = false;
var focus_weak_share = 0.3;
var focus_weak_boost = 4;
var shifted_keys = {
    '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6',
    '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=',
    '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'",
    '<': ',', '>': '.', '?': '/'
};
var sound_files = {click: "click.wav", clack: "clack.wav", ding: "ding.wav"};
var audio_ctx = null;
var sound_buffers = {};


$(document).ready(function() {
    load_sounds();
    build_keyboard();
    if (localStorage.data != undefined) {
        load();
        render();
    }
    else {
        set_level(1);
    }
    $(document).keypress(keyHandler);
    $('#kb-toggle').click(toggle_keyboard);
    load_stats();
    load_streak();
    render_streak(false);
    $('#stats-toggle').click(toggle_stats);
    $('#stats-reset').click(reset_stats);
    try {
        focus_weak = localStorage.focus_weak == "true";
    } catch (e) {}
    $('#focus-weak').click(toggle_focus_weak);
    render_focus_weak();
    try {
        if (localStorage.stats_open == "true") {
            $('#stats').addClass('open');
        }
    } catch (e) {}
    render_stats();
    $(document).keydown(function(e) {
        if (e.which == 27) {
            toggle_keyboard();
        }
    });
});


function set_level(l) {
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
}


function keyHandler(e) {
    var key = String.fromCharCode(e.which);
    if (data.chars.indexOf(key) > -1){
        e.preventDefault();
    }
    var correct = key == data.word[data.word_index];
    play_sound(correct ? "click" : "clack");
    data.keys_hit += key;
    record_stat(data.word[data.word_index], key);
    if(correct) {
        data.in_a_row[key] += 1;
        update_streak(true);
    }
    else {
        data.in_a_row[data.word[data.word_index]] = 0;
        data.in_a_row[key] = 0;
        update_streak(false);
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
}


function load_sounds() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
        return;
    }
    audio_ctx = new Ctx();
    $.each(sound_files, function(name, url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "arraybuffer";
        xhr.onload = function() {
            audio_ctx.decodeAudioData(xhr.response, function(buffer) {
                sound_buffers[name] = buffer;
            }, function() {});
        };
        xhr.send();
    });
}


function play_sound(name) {
    var buffer = sound_buffers[name];
    if (!buffer) {
        // Not decoded yet, or Web Audio unavailable (e.g. opened via file://)
        (new Audio(sound_files[name])).play();
        return;
    }
    if (audio_ctx.state == "suspended") {
        audio_ctx.resume();
    }
    var source = audio_ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(audio_ctx.destination);
    source.start(0);
}


function record_stat(expected, typed) {
    if (stats[expected] == undefined) {
        stats[expected] = {hits: 0, misses: 0, typed: {}};
    }
    var s = stats[expected];
    if (typed == expected) {
        s.hits += 1;
    }
    else {
        s.misses += 1;
        s.typed[typed] = (s.typed[typed] || 0) + 1;
    }
    save_stats();
    render_stats();
}


function load_streak() {
    try {
        if (localStorage.streak != undefined) {
            streak = JSON.parse(localStorage.streak);
        }
    } catch (e) {
        streak = {current: 0, best: 0};
    }
}


function update_streak(correct) {
    var broken = !correct && streak.current > 0;
    streak.current = correct ? streak.current + 1 : 0;
    streak.best = Math.max(streak.best, streak.current);
    try {
        localStorage.streak = JSON.stringify(streak);
    } catch (e) {}
    render_streak(broken);
}


function render_streak(broken) {
    $('#streak-count').text(streak.current);
    $('#streak-best').text(streak.best);
    var el = $('#streak');
    el.removeClass('broken');
    if (broken) {
        el[0].offsetWidth;
        el.addClass('broken');
    }
}


function toggle_focus_weak() {
    focus_weak = !focus_weak;
    try {
        localStorage.focus_weak = focus_weak;
    } catch (e) {}
    render_focus_weak();
    data.word = generate_word();
    data.word_index = 0;
    data.keys_hit = "";
    data.word_errors = {};
    render();
    save();
}


function render_focus_weak() {
    $('#focus-weak-state').text(focus_weak ? "on" : "off");
    $('#focus-weak').toggleClass('on', focus_weak);
}


function key_weight(k) {
    var s = stats[k];
    if (s == undefined) {
        return 1;
    }
    return 1 + focus_weak_boost * s.misses / (s.hits + s.misses + 5);
}


function choose_weighted(a) {
    var total = 0;
    for (var i = 0; i < a.length; i++) {
        total += key_weight(a[i]);
    }
    var r = Math.random() * total;
    for (var i = 0; i < a.length; i++) {
        r -= key_weight(a[i]);
        if (r < 0) {
            return a[i];
        }
    }
    return a[a.length - 1];
}


function load_stats() {
    try {
        if (localStorage.stats != undefined) {
            stats = JSON.parse(localStorage.stats);
        }
    } catch (e) {
        stats = {};
    }
}


function save_stats() {
    try {
        localStorage.stats = JSON.stringify(stats);
    } catch (e) {}
}


function reset_stats() {
    stats = {};
    save_stats();
    render_stats();
}


function toggle_stats() {
    $('#stats').toggleClass('open');
    try {
        localStorage.stats_open = $('#stats').hasClass('open');
    } catch (e) {}
}


function key_label(k) {
    if (k == ' ') {
        return "&#9141;";
    }
    if (k == '\r' || k == '\n') {
        return "&#8629;";
    }
    return $('<span>').text(k).html();
}


function render_stats() {
    var missed = [];
    for (var k in stats) {
        if (stats[k].misses > 0) {
            missed.push(k);
        }
    }
    missed.sort(function(a, b) {
        var sa = stats[a], sb = stats[b];
        if (sb.misses != sa.misses) {
            return sb.misses - sa.misses;
        }
        return sb.misses / (sb.hits + sb.misses) - sa.misses / (sa.hits + sa.misses);
    });
    if (missed.length == 0) {
        $('#stats-list').html("<div class='stats-empty'>No mistakes yet.</div>");
        return;
    }
    var most = stats[missed[0]].misses;
    var html = "";
    for (var i = 0; i < Math.min(missed.length, stats_limit); i++) {
        var k = missed[i];
        var s = stats[k];
        var accuracy = Math.round(100 * s.hits / (s.hits + s.misses));
        var instead = null;
        for (var t in s.typed) {
            if (instead == null || s.typed[t] > s.typed[instead]) {
                instead = t;
            }
        }
        var name = k == ' ' ? "space" : k;
        var tip = name + ": missed " + s.misses + " times, " + accuracy + "% accurate";
        if (instead != null) {
            tip += ", usually typed " + (instead == ' ' ? "space" : instead) + " instead";
        }
        html += "<div class='stats-row' title='" + $('<span>').text(tip).html().replace(/'/g, "&#39;") + "'>";
        html += "<span class='stats-rank'>" + (i + 1) + "</span>";
        html += "<span class='kb-key'>" + key_label(k) + "</span>";
        html += "<span class='stats-bar'><span style='width: " + Math.round(100 * s.misses / most) + "%'></span></span>";
        html += "<span class='stats-num'>" + s.misses + "&times;</span>";
        html += "<span class='stats-num'>" + accuracy + "%</span>";
        html += "<span class='stats-instead'>" + (instead == null ? "" : "&rarr; " + key_label(instead)) + "</span>";
        html += "</div>";
    }
    $('#stats-list').html(html);
}


function level_up() {
    if (data.level + 1 <= data.chars.length - 1) {
        play_sound("ding");
    }
    l = Math.min(data.level + 1, data.chars.length);
    set_level(l);
}


function save() {
    localStorage.data = JSON.stringify(data);
}


function load() {
    data = JSON.parse(localStorage.data);
}


function render() {
    render_level();
    render_word();
    render_level_bar();
    render_keyboard();
}


function build_keyboard() {
    var indents = [0, 12, 18, 0];
    var html = "";
    for (var r = 0; r < colemak_rows.length; r++) {
        html += "<div class='kb-row' style='padding-left: " + indents[r] + "px'>";
        if (r == 3) {
            html += "<span class='kb-key' data-key='shift' style='width: 40px'>&#8679;</span>";
        }
        for (var i = 0; i < colemak_rows[r].length; i++) {
            var k = colemak_rows[r][i];
            var cls = "kb-key";
            if (colemak_home.indexOf(k) > -1) {
                cls += " home";
            }
            if (k == "t" || k == "n") {
                cls += " bump";
            }
            html += "<span class='" + cls + "' data-key='" + (k == "'" ? "&#39;" : k) + "'>" + $('<span>').text(k).html() + "</span>";
        }
        if (r == 3) {
            html += "<span class='kb-key' data-key='shift' style='width: 40px'>&#8679;</span>";
        }
        html += "</div>";
    }
    html += "<div class='kb-row' style='justify-content: center'><span class='kb-key' data-key=' ' style='width: 150px'>&nbsp;</span></div>";
    $('#keyboard').html(html);
    try {
        if (localStorage.keyboard_open == "true") {
            $('#keyboard').addClass('open');
        }
    } catch (e) {}
}


function toggle_keyboard() {
    $('#keyboard').toggleClass('open');
    try {
        localStorage.keyboard_open = $('#keyboard').hasClass('open');
    } catch (e) {}
}


function render_keyboard() {
    $('#keyboard .kb-key').removeClass('next');
    var c = data.word[data.word_index];
    if (c == undefined) {
        return;
    }
    var base = c;
    var shift = false;
    if (shifted_keys[c] != undefined) {
        base = shifted_keys[c];
        shift = true;
    }
    else if (c != c.toLowerCase()) {
        base = c.toLowerCase();
        shift = true;
    }
    $('#keyboard .kb-key').filter(function() {
        return $(this).attr('data-key') == base || (shift && $(this).attr('data-key') == 'shift');
    }).addClass('next');
}


function render_level() {
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
}


function render_level_bar() {
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
    
}   

function render_word() {
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
}


function generate_word() {
    word = '';
    var pick = focus_weak ? choose_weighted : choose;
    for(var i = 0; i < data.word_length; i++) {
        if (focus_weak && Math.random() < focus_weak_share) {
            c = choose_weighted(get_level_chars());
        }
        else {
            c = pick(get_training_chars());
        }
        if(c != undefined && c != word[word.length-1]) {
            word += c;
        }
        else {
            word += pick(get_level_chars());
        }
    }
    return word;
}


function get_level_chars() {
    return data.chars.slice(0, data.level + 1).split('');
}

function get_training_chars() {
    var training_chars = [];
    var level_chars = get_level_chars();
    for(var x in level_chars) {
        if (data.in_a_row[level_chars[x]] < data.consecutive) {
            training_chars.push(level_chars[x]);
        }
    }
    return training_chars;
}

function choose(a) {
    return a[Math.floor(Math.random() * a.length)];
}









































