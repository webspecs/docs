#!/usr/bin/env node

var fs = require("fs-extra")
,   pth = require("path")
,   jn = pth.join
,   findit = require("findit")
,   whacko = require("whacko")
,   rfs = function (file) { return fs.readFileSync(file, "utf8"); }
,   wfs = function (file, content) { fs.writeFileSync(file, content, { encoding: "utf8" }); }
,   genDir = __dirname
,   contentDir = jn(genDir, "content")
,   outDir = jn(genDir, "..")
;


// XXX
//  - find all files in ./content/
//  - if not HTML, copy it to the root
//  - if HTML, process it
//      - apply simple template
//      - from assets: favicon, fonts, logo
//      - not from assets: style (ours)

function content2out (path) {
    return jn(outDir, path.replace(contentDir, ""));
}

function processDir (dir) {
    var newDir = content2out(dir);
    console.log("> Creating directory ... " + newDir);
    fs.mkdirpSync(newDir);
}

function processFile (file) {
    var newFile = content2out(file);
    if (pth.basename(newFile) === ".DS_Store") return;
    console.log("> Copying .............. " + newFile);
    fs.copySync(file, newFile);
}

function processHTML (file) {
    var newFile = content2out(file);
    console.log("> Processing ........... " + newFile);
    var $ = whacko.load(rfs(file))
    ,   $tmpl = whacko.load(rfs(jn(genDir, "templates/default.html")))
    // ,   $html = $tmpl("html")
    ;
    // if there's a skip attribute, copy verbatim
    if ($("html").attr("skip")) return wfs(newFile, rfs(file).replace(/\s+skip=['"]?true['"]?/, ""));
    
    // process content
    var $script = $("script[type='application/json']").first()
    ,   data = JSON.parse($script.text())
    ;
    $script.remove();
    if (!data.headerTitle) data.headerTitle = data.title + " | Web Platform Specs";
    $tmpl("title").text(data.headerTitle);
    $tmpl("h1").text(data.title);
    if (data.subtitle) $tmpl("div.subtitle").text(data.subtitle);
    else {
        $tmpl("h1").addClass("onlyTitle");
        $tmpl("div.subtitle").remove();
    }
    $tmpl("div.content").append($("body").html());
    wfs(newFile, $tmpl.html().replace(/&amp;apos;/g, "'"));
}


function processSource (path) {
    var finder = findit(path);
    finder.on("directory", processDir);
    finder.on("file", function (file) {
        var ext = pth.extname(file);
        if (ext === ".html") processHTML(file);
        else                 processFile(file);
    });
    finder.on("end", function () {
        console.log("OK! Source tree processed.");
    });
}

processSource(contentDir);
