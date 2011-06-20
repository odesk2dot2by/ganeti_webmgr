/** @namespace data.opresult */

var checkInterval;
var actions_enabled;

// poll for job status, first poll is delayed by 3000ms
function poll_job_status(cluster, job_id, callback, errback) {
    actions_enabled = false;
    $('#actions a').addClass('disabled');
    checkInterval = setInterval(get_job_status, 3000, cluster, job_id, callback, errback);
}

// Get job status.
// The cluster should be the URL corresponding to a cluster slug.
function get_job_status(cluster, job_id, callback, errback) {
    $.ajax({
        url: cluster + "/job/" + job_id + "/status/",
        success: function(data) {
            if (data.status == 'success'){
                $("#messages").empty();
                clearInterval(checkInterval);
                if (callback!=undefined){
                    callback();
                }
            } else if (data.status == 'error' && errback != undefined) {
                errback();
            }

            display_job(cluster, data);
            if (data.status == 'error'){
                if (checkInterval != undefined){
                    clearInterval(checkInterval);
                    checkInterval = undefined;
                }
            }
        }
    });
}

function display_job(cluster, data) {
    // get the sub operation that is either running or errored
    for (var sub_op=0; sub_op<data['opstatus'].length-1;) {
        if (data['opstatus'][sub_op] != 'success') {
            break;
        }
        sub_op++;
    }

    $("#messages").empty();

    var op = format_op(data['ops'][sub_op]['OP_ID']);
    var html = $("<li class='job'><h3>"+op+"</h3></li>");
    $("#messages").append(html);
    var scrollable = $('<div class="scrollable"><div class="detector"></div></div>');
    var error = undefined;
    html.append(scrollable);

    if (data.status == 'error') {
        html.addClass('error');
        var reason = data.opresult[sub_op][1][0];
        var job_id = data['id'];
        var href = cluster + "/job/" + job_id + "/clear/";
        html.children('h3')
        .append("<a class='clear' title='clear error' href='"+href+"'></a>");
        error = $("<pre class='error'>" + reason + "</pre>");
        scrollable.append(error);
        actions_enabled = true;
        $('#actions a').removeClass('disabled');
    }

    // append log messages that are not already displayed
    var current_log_count = $("#log ul li").length;
    if (data['oplog'][sub_op].length != 0) {
        var log_html = html.children('.op_log');
        if (log_html.length==0){
            log_html = $("<pre class='op_log'><ul></ul></pre>");
            scrollable.append(log_html);
        }
        var log = data['oplog'][sub_op];
        for (var i=current_log_count; i<log.length; i++) {
            log_html.children("ul")
            .append("<li>"+log[i][3]+"</li>");
        }
    }

    // XXX hack to ensure log area is same width as error area.
    if (log_html != undefined) {
        var width = $(html).find('.scrollable .detector').width()
        width -= (log_html.innerWidth() - log_html.width()) // subtract padding
        log_html.width(width);
        $(html).find('.scrollable').css('display', 'block')
    }
}

function format_op(str){
    str = str.substring(3).toLowerCase();
    while(str.indexOf('_')!=-1) {
        str = str.replace('_',' ')
    }
    str = cap_first(str);
    return str
}

function cap_first(str) {
    var new_str = '';
    str = str.split(' ');
    for(var i=0; i < str.length; i++) {
        new_str += str[i].substring(0,1).toUpperCase() +
        str[i].substring(1,str[i].length) + ' ';
    }
    return new_str;
}

$("#messages a.clear").live("click", function(event){
    event.preventDefault();
    var error = $(this).parent().parent();
    $.post(this.href, function(){
        error.fadeOut(1000, function(){
            error.remove();
        });
    });
});