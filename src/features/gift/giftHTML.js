import showdown from "showdown";
var converter;

export default function giftPreviewHTML(qArray, theDiv) {
  converter = new showdown.Converter();
  var html = "";
  var q;
  for (let i = 0; i < qArray.length; i++) {
    // console.log("i = " + i + " and qArray[i] is '" + qArray[i] );
    q = qArray[i];
    html += `<div id="question_${i}">`;
    // console.log("q.type is '" + q.type );
    switch (q.type) {
      case "Description":
        theDiv +=
          html +
          `
          ${makeTitle("Description", q.title)}
          <p> ${applyFormat(q.stem)} </p>
          `;
        break;
      case "MC":
        theDiv +=
          html +
          `${makeTitle("Multiple choice", q.title)}
        <p>${applyFormat(q.stem)}</p>
        ${formatAnswers(q.choices)}
        ${formatFeedback(q.globalFeedback)}</div>
        `;
        html = "";
        break;
      case "Short":
        theDiv +=
          html +
          `
          ${makeTitle("Short answer", q.title)}
          <p>${applyFormat(q.stem)}</p>
          ${formatAnswers(q.choices)}
          ${formatFeedback(q.globalFeedback)}
          </div>
          `;
        html = "";
        break;
      case "Essay":
        html += makeTitle("Essay", q.title);
        html += "<p>" + applyFormat(q.stem) + "</p>";
        html += formatFeedback(q.globalFeedback) + "</div>";
        theDiv += html;
        html = "";
        // html += formatAnswers(q.choices);
        break;
      case "TF":
        html += makeTitle("True/False", q.title);
        html +=
          "<p>" +
          "<em>(" +
          (q.isTrue ? "True" : "False") +
          ")</em> " +
          applyFormat(q.stem) +
          "</p>";
        html += formatFeedback(q.globalFeedback) + "</div>";
        theDiv += html;
        html = "";
        // html += formatAnswers(q.choices);
        break;
      case "Matching":
        html += makeTitle("Matching", q.title);
        html += "<p>" + applyFormat(q.stem) + "</p>";
        //                theDiv.append(html); html = "";
        formatMatchingAnswers(q, theDiv, i, html);
        html = formatFeedback(q.globalFeedback) + "</div>";
        theDiv += html;
        html = "";
        break;
      // for case "Matching": see https://stackoverflow.com/a/35493737/1168342
      default:
        break;
    }
  }
  return theDiv;
  // return html;
}

function makeTitle(type, title) {
  return `<b>${type} ${title !== null ? ` " ${title} "` : ``}</b>`;
}

function formatAnswers(choices) {
  var html = "<ul>";
  for (var a = 0; a < choices.length; a++) {
    var answer = choices[a];
    html += `<li class="'${answer.isCorrect ? "rightAnswer" : "wrongAnswer"}'">
      ${answer.weight !== null ? `<em>("${answer.weight}"%)</em>` : ``} 
      ${applyFormat(answer.text)} 
      ${answer.feedback !== null ? ` [${applyFormat(answer.feedback)}]` : ""}
      </li>`;
  }
  html += "</ul>";
  return html;
}

function formatMatchingAnswers(q, theDiv, qNum, html) {
  var rightSideChoices = new Set();
  //    var html ='';
  var htmlLines = "";
  for (var i = 0; i < q.matchPairs.length; i++) {
    htmlLines +=
      '<path id="line' +
      i +
      '" stroke="rgba(180,180,255,0.5)" stroke-width="5" fill="none"/>';
  }
  html +=
    '<svg class="theSVG" style="position: absolute; z-index: -1;" width="100%" height="100%" z-index="-1"><g>' +
    htmlLines +
    "</g></svg>";

  html += '<div class="row"><div class="col-md-6">'; // left side
  for (var i = 0; i < q.matchPairs.length; i++) {
    var pair = q.matchPairs[i];
    html += '<div id="left' + i + '" style="background:#ddddff">';
    html += "<p>" + applyFormat(pair.subquestion) + "</p>";
    //        html += applyFormat(pair.subquestion);
    html += "</div>";
    rightSideChoices.add(pair.subanswer);
  }
  console.log("Found rightSideChoices: " + rightSideChoices.size);
  html += "</div>";

  html += '<div class="col-md-6">'; // right side
  for (
    var it = rightSideChoices.values(), val = null;
    (val = it.next().value);

  ) {
    //console.log('answer: ' + val);
    html +=
      '<div id="right_' +
      val.replace(/\s/g, "_") +
      '" style="background:#ddddff">';
    html += "<p>" + val + "</p>";
    //        html += val;
    html += "</div>";
  }
  html += "</div></div>";
  // make the SVG for lines, see https://stackoverflow.com/a/35493737/1168342
  theDiv.append(html);
  html = ""; // force the HTML into the DOM

  // set the lines up - search only inside this question's div (theDiv)
  for (var i = 0; i < q.matchPairs.length; i++) {
    var qDiv = document.querySelector("#question_" + qNum);
    var pair = q.matchPairs[i];
    var line = qDiv.find("#line" + i);
    console.log("line: " + line);
    var leftDiv = qDiv.find("#left" + i);
    console.log("leftDiv: " + leftDiv);
    var rightDiv = qDiv.find("#right_" + pair.subanswer.replace(/\s/g, "_"));
    console.log("rightDiv: " + rightDiv);
    var pos1 = leftDiv.offset();
    var pos2 = rightDiv.offset();
    var svg = qDiv.find(".theSVG").offset();
    // line
    //   .attr('x1', pos1.left - svg.left + leftDiv.width())
    //   .attr('y1', pos1.top + leftDiv.height()/2 - svg.top)
    //   .attr('x2', pos2.left - svg.left)
    //   .attr('y2', pos2.top + rightDiv.height()/2 - svg.top);
    var x1 = pos1.left - svg.left + leftDiv.width();
    var y1 = pos1.top + leftDiv.height() / 2 - svg.top;
    var x2 = pos2.left - svg.left;
    var y2 = pos2.top + rightDiv.height() / 2 - svg.top;
    var inset = 10;
    line.attr(
      "d",
      "M" +
        x1 +
        "," +
        y1 +
        " C" +
        (x1 + inset) +
        "," +
        y1 +
        " " +
        (x2 - inset) +
        "," +
        y2 +
        " " +
        x2 +
        "," +
        y2
    );
    qDiv.find(".theSVG").attr("height", pos1.top + leftDiv.height() - svg.top);
  }
  // return html;
}

function applyFormat(giftText) {
  // console.log("applyFormat: " + giftText.format + " to " + giftText.text);
  var html = "";
  switch (giftText.format) {
    case "moodle":
    case "plain":
    case "html":
      html = giftText.text;
      break;

    case "markdown":
      html = converter.makeHtml(giftText.text);
      break;

    default:
      break;
  }
  if (html == "") html = "&nbsp;"; // special case so div's aren't empty
  return html;
}

function formatFeedback(feedback) {
  return feedback !== null
    ? '<p style="margin-left: 40px"><em>General feedback:</em> ' +
        applyFormat(feedback) +
        "</p>"
    : "";
}
