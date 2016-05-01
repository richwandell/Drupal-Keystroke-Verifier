(function($){
    Drupal.behaviors.keystroke_verifier = {
        attach: function(context, settings){

            var presses = [];
            var all_presses = [];
            var first = true;
            var package_queue = [];
            var all_packages = [];
            var sent = 0;
            var accept = 0;
            var fail = 0;
            var open = false;

            function sendPackage(){
                if(package_queue.length == 0) return;
                if($("input[name='ksv_digraphs']")[0]){
                    var oldval = $("input[name='ksv_digraphs']").val();
                    try{
                        var old_data = JSON.parse(oldval);
                    }catch(e){}
                    if(old_data){
                        old_data.push(package_queue[0]);
                        $("input[name='ksv_digraphs']").val(JSON.stringify(old_data));
                    }else{
                        var data = JSON.stringify(package_queue);
                        $("input[name='ksv_digraphs']").val(data);
                    }
                }

                package_queue.shift();

                $.ajax({
                    url: '/keystroke_verifier/ajax/' + settings.keystroke_verifier.csrf + '/package',
                    type: 'post',
                    dataType: 'json',
                    data: {
                        'package': all_packages.slice(all_packages.length - settings.keystroke_verifier.plen)
                    },
                    success: function(res){
                        sent++;
                        if(package_queue.length > 0){
                            sendPackage();
                        }
                        if(res.good){
                            accept++;
                            $("#keystroke_verifier_good_image").show();
                            $("#keystroke_verifier_bad_image").hide();
                            var acceptance_rate = accept / sent;
                            $("#keystroke_verifier_good_image span").text("Acceptance Rate: " + acceptance_rate);
                        }else{
                            fail++;
                            $("#keystroke_verifier_good_image").hide();
                            $("#keystroke_verifier_bad_image").show();
                            var acceptance_rate = accept / sent;
                            $("#keystroke_verifier_bad_image span").text("Acceptance Rate: " + acceptance_rate);
                        }
                    }
                });
            }

            function genPackage(){
                var digraphs = [];
                for(var x = 0; x < presses.length; x++){
                    if(presses[x-1]){
                        var d = [
                            presses[x-1]['key'],
                            presses[x]['key'],
                            presses[x]['timestamp'] - presses[x-1]['timestamp']
                        ];
                        if(d[2] >= settings.keystroke_verifier.tbp) continue;
                        digraphs.push(d);
                    }
                }
                package_queue.push(digraphs);
                presses = [];
                all_packages = all_packages.concat(digraphs);
                first = false;
            }

            $(document).keypress(function(e){
                if(e.which == 13) return;
                presses.push({
                    "key": String.fromCharCode(e.which),
                    "timestamp": new Date().getTime()
                });
                if(first){
                    if(presses.length >= settings.keystroke_verifier.fkeys){
                        genPackage();
                    }
                }else if(presses.length >= settings.keystroke_verifier.ikeys){
                    genPackage();
                }

                sendPackage();
            });
            if(settings.keystroke_verifier.show_img) {
                $("body").append("" +
                    "<div id='keystroke_verifier_good_image' style='display: none; position: fixed; bottom: 0px; left: 0px;'>" +
                    "<ol " +
                        "style='" +
                        "padding-left: 25px; " +
                        "margin: 0px; " +
                        "display: none; " +
                        "background: white;" +
                        "border: 1px solid whitesmoke;" +
                        "border-radius: 10px;" +
                        "margin-bottom: 10px;" +
                        "box-shadow: 0 0 10px rgba(0, 0, 0, 0.26);"+
                    "'></ol>" +
                    "<img src='" + settings.keystroke_verifier.good_img + "' />" +
                    "<span " +
                    "style='display: inline-block; vertical-align: top; border: 1px solid rgba(128, 128, 128, 0.25);"+
                    "padding: 2px 7px; background: white;'"+
                    "></span>" +
                    "</div>" +
                    "<div id='keystroke_verifier_bad_image' style='position: fixed; bottom: 0px; left: 0px;'>" +
                    "<ol " +
                    "style='" +
                    "padding-left: 25px; " +
                    "margin: 0px; " +
                    "display: none; " +
                    "background: white;" +
                    "border: 1px solid whitesmoke;" +
                    "border-radius: 10px;" +
                    "margin-bottom: 10px;" +
                    "box-shadow: 0 0 10px rgba(0, 0, 0, 0.26);"+
                    "'></ol>" +
                    "<img src='" + settings.keystroke_verifier.bad_img + "' />" +
                    "<span " +
                    "style='display: inline-block; vertical-align: top; border: 1px solid rgba(128, 128, 128, 0.25);"+
                    "padding: 2px 7px; background: white;'"+
                    "></span>" +
                    "</div>");
            }
            $("#keystroke_verifier_good_image, #keystroke_verifier_bad_image")
                .click(function(e){
                    var open = $(this).data("open") || false;
                    if(open){
                        $("#keystroke_verifier_good_image, #keystroke_verifier_bad_image").find("ol").hide();
                        $("#keystroke_verifier_good_image, #keystroke_verifier_bad_image").data("open", false);
                        return;
                    }else{
                        $("#keystroke_verifier_good_image, #keystroke_verifier_bad_image").find("ol").show();
                        $("#keystroke_verifier_good_image, #keystroke_verifier_bad_image").data("open", true);
                    }
                    $.ajax({
                        url: '/keystroke_verifier/ajax/' + settings.keystroke_verifier.csrf + '/whoami',
                        type: 'post',
                        dataType: 'json',
                        data: {
                            'package': all_packages
                        },
                        success: function(res){
                            if(res.tests){
                                $("#keystroke_verifier_good_image, #keystroke_verifier_bad_image").find("ol").html("");
                                $(res.tests).each(function(i, e){
                                    $("#keystroke_verifier_good_image, #keystroke_verifier_bad_image")
                                        .find("ol")
                                        .append("<li>"+ e.name + "</li>");
                                });
                            }
                        }
                    });
                });
        }
    };
})(jQuery);