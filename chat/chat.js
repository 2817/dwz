
//主JS文件需要修改


$(function() {
	//WebSocket 链接
	if (typeof console == "undefined") {
	    this.console = { 
	    	log: function (msg) {
	    	} 
	    };
	}

	if(!window.localStorage) {
		alert('您的浏览器太久，换个新的试试。');
	}

	WEB_SOCKET_SWF_LOCATION = "./chat/WebSocketMain.swf";
	WEB_SOCKET_DEBUG = true;
	var ws,client_list={};
	var chatChannel = '0000'; //定义聊天频道
	var signIn = true; //用户退出
	var name = window.localStorage.getItem('username') || null;

	// 连接服务端
	function connect() {
	   // 创建websocket
	   ws = new WebSocket("ws://"+document.domain+":7272");
	   // 当socket连接打开时，输入用户名
	   ws.onopen = onopen;
	   // 当有消息时根据消息类型显示不同信息
	   ws.onmessage = onmessage; 
	   ws.onclose = function() {
		  console.log("连接关闭，定时重连");
	      connect();
	   };
	   ws.onerror = function() {
	 	  console.log("出现错误");
	   };
	}

	//登记用户名
	function show_prompt(){  
	    name = prompt('输入你的名字：', '');
		window.localStorage.setItem('username', name);
	    if(!name || name=='null'){  
	        alert("输入名字为空或者为'null'，请重新输入！");  
	        show_prompt();
	    }
	}

	//监听WebSocket打开状态
	function onopen() {
		if(!name) {
	        show_prompt();
	    }
	    // 登录
	    var login_data = JSON.stringify({
	    	type : 'login',
	    	client_name : name.replace(/"/g, '\\"'),
	    	room_id : chatChannel&&signIn ? chatChannel : '11111'
	    });

	    console.log("websocket握手成功，发送登录数据:"+login_data);
	    ws.send(login_data);
	}

	//监听WebSocket接收消息
	function onmessage(e) {
        console.log(e.data);
        var data = eval("("+e.data+")");
        //var data = JSON.parse(e.data);
        switch(data['type']){
            // 服务端ping客户端
            case 'ping':
                ws.send('{"type":"pong"}');
                break;;
            // 登录 更新用户列表
            case 'login':
                //{"type":"login","client_id":xxx,"client_name":"xxx","client_list":"[...]","time":"xxx"}
                say(data['client_id'], data['client_name'],  data['client_name']+' 加入了聊天室', data['time']);

                if(data['client_list']) {
                    client_list = data['client_list'];
                } else {
                    client_list[data['client_id']] = data['client_name']; 
                }
                flush_client_list();
                console.log(data['client_name']+"登录成功");
                break;
            // 发言
            case 'say':
                //{"type":"say","from_client_id":xxx,"to_client_id":"all/client_id","content":"xxx","time":"xxx"}
                say(data['from_client_id'], data['from_client_name'], data['content'], data['time']);
                break;
            // 用户退出 更新用户列表
            case 'logout':
                //{"type":"logout","client_id":xxx,"time":"xxx"}
                say(data['from_client_id'], data['from_client_name'], data['from_client_name']+' 退出了', data['time']);
                delete client_list[data['from_client_id']];
                flush_client_list();
        }
    }

    //提交对话
    $('#chat-form').find('input').click(function() {
    	var input = document.getElementById("textarea");
		var to_client_id = $("#chat-client-list option:selected").attr("value");
		var to_client_name = $("#chat-client-list option:selected").text();
		ws.send('{"type":"say","to_client_id":"'+to_client_id+'","to_client_name":"'+to_client_name+'","content":"'+input.value.replace(/"/g, '\\"').replace(/\n/g,'\\n').replace(/\r/g, '\\r')+'"}');
		input.value = "";
		input.focus();
    })

    // 刷新用户列表框
    function flush_client_list(){
    	var userlist_window = $("#chat-userlist");
    	var client_list_slelect = $("#chat-client-list");
    	userlist_window.empty();
    	client_list_slelect.empty();
    	client_list_slelect.append('<option value="all" id="cli_all">所有人</option>');
    	for(var p in client_list){
            userlist_window.append('<li id="'+p+'"><a href="#">'+client_list[p]+'</a></li>');
            client_list_slelect.append('<option value="'+p+'">'+client_list[p]+'</option>');
        }
    	$("#chat-client-list").val(select_client_id);
    }

    //发言
    function say(from_client_id, from_client_name, content, time){
    	var talkDOM = '';
    	if(from_client_name == name) {
    		talkDOM = '<div class="speech_item chat-isMyself"><div class="chat-imgWrap"><img src="http://lorempixel.com/38/38/?'+from_client_id+'" class="user_icon" /></div>' + 
    					'<div class="chat-nameWrap"><p>' + time + '</p><p>' + from_client_name + '</p></div><div style="clear:both;"></div><p class="chat-talk-content">' +
    					content + '</p></div>';
    	} else {
    		talkDOM = '<div class="speech_item"><div class="chat-imgWrap"><img src="http://lorempixel.com/38/38/?'+from_client_id+'" class="user_icon" /></div>' + 
    					'<div class="chat-nameWrap"><p>' + time + '</p><p>' + from_client_name + '</p></div><div style="clear:both;"></div><p class="chat-talk-content">' +
    					content + '</p></div>';
    	}
    	
    	$("#chat-dialog").append(talkDOM);
    	$("#chat-dialog").scrollTop( $("#chat-dialog")[0].scrollHeight);
    }

    //向指定人员发言
    $(function(){
    	select_client_id = 'all';
	    $("#client_list").change(function(){
	         select_client_id = $("#client_list option:selected").attr("value");
	    });
    });


	//切换聊天频道
	$('#chat-select-channel').click(function() {
		var $chatChannel = '';
		$('.chat-channel').children('select').each(function(index, element) {
			$chatChannel += $(this).val(); 
		})
		chatChannel = $chatChannel;
		if(ws) {
			ws.close();
			flush_client_list();
			$("#chat-dialog").empty();
			connect();
		}
	})

	//退出聊天，断开 WebSocket 连接
	$('#chat-dialog-close').click(function() {
		if(ws) {
			signIn = false;
			ws.close();
			flush_client_list();
			connect();
			$('.close').click();
		} 
	})

	connect();


	
})