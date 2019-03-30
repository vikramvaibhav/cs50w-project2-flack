const templateLeft = Handlebars.compile(document.querySelector('#left').innerHTML);
const templateRight = Handlebars.compile(document.querySelector('#right').innerHTML);

$(document).ready(function() {

	//Connect to webscoket

	var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

	privateWindow=false;
    inRoom=false;
    socket.on('connect', () => {
    	
        $('#messageInput').on('keyup',function(key) {
            activeChannel=$('#channelList .active').attr('id');
            //broadcast
            if (key.keyCode==13 && $(this).val()!='' && !privateWindow && !inRoom) {
                const mymessage=$(this).val();
                const username=localStorage.getItem('username');
                const time=new Date().toLocaleString();
                $('#messageInput').val('')
                socket.emit('submit to all', {'mymessage':mymessage, 'username':username, 'time':time});
            }//channel
            if (key.keyCode==13 && $(this).val()!='' && !privateWindow && inRoom) {
                const mymessage=$(this).val();                                      
                const username=localStorage.getItem('username');                            
                const time=new Date().toLocaleString();
                $('#messageInput').val('')
                socket.emit('submit to room', {'channel':activeChannel, 'mymessage':mymessage, 'username':username, 'time':time});
            //send private
            } else if (key.keyCode==13 && $(this).val()!='' && privateWindow && !inRoom) {
                const mymessage=$(this).val();
                const username=localStorage.getItem('username');
                const username2=localStorage.getItem('activeMessage');
                const time=new Date().toLocaleString();
                $('#messageInput').val('')
                socket.emit('private', {'mymessage':mymessage, 'username':username, 'time':time, 'username2':username2});
            }
        });

        $('#channelList').on('click', 'li', function() {
            $('#messageInput').focus();
            if (!localStorage.getItem('activeChannel')) {
                activeChannel='general';
            } else {
                activeChannel=localStorage.getItem('activeChannel');
            }
            const username=localStorage.getItem('username');
            const time=new Date().toLocaleString();
            $(this).addClass('active');
            $(this).siblings().removeClass('active');
            $('#dm > li').removeClass('active');
            $('#messages').html('');
            if (activeChannel!='general' && !privateWindow) {
                socket.emit('leave', {'channel':activeChannel, 'mymessage':'has left the room', 'username':username, 'time':time});
            }
            activeChannel=$('#channelList .active').attr('id');
            localStorage.setItem('activeChannel',activeChannel)
            if (activeChannel=='general') {
                inRoom=false;
                privateWindow=false;
                return socket.emit('come back to general');
            } else {
                inRoom=true;
                privateWindow=false;
            }
            socket.emit('join', {'channel':activeChannel, 'mymessage':'has entered the room', 'username':username, 'time':time});
         });

        if (!localStorage.getItem('username')) {
            $('#modalCenter').modal({backdrop: 'static', keyboard: false});
            $('.modal-title').text('Please enter your username');
            $('#modalInput').val('');
        }
    });

    socket.on('announce to all', data=> {
        if (!privateWindow) {
            loadMessages(data);
        }
        
        $('.text-orange').on('click',function() {
            chooseUser($(this).text());
        });
    });

    socket.on('joined', data=> {
        loadMessages(data);
        $('#messageInput').focus();
        $('.text-orange').on('click',function() {
            chooseUser($(this).text());
        });
    });

    socket.on('left', data=> {
        loadMessages(data);
    });

    socket.on('announce to room', data=> {
        loadMessages(data);
        $('.text-orange').on('click',function() {
            chooseUser($(this).text());
        });
    }); 

    socket.on('load channels', data=> {
        $('#channelList li').remove();
        loadChannels(data);
        $('#'+localStorage.getItem('activeChannel')).click();
    });

    socket.on('add username', data=> {
        if (data['error']!='') {
            window.setTimeout(function () {
                $('#modalCenter').modal({backdrop: 'static', keyboard: false});
                $('.modal-title').text(data['error']);
                $('#modalInput').val('');
                $('#modalButton').attr('disabled',true);
            }, 900);
        } 
        else {
            localStorage.setItem('username',data['username']);
            $('#username').text(localStorage.getItem('username'));
            $('#modalCenter').modal('hide');
            $('#general').click();
            $('#messageInput').focus();
        }
    });

    socket.on('add channel', data=> {
        if (data['error']!='') {
            window.setTimeout(function () {
                $('#modalCenter').modal({backdrop: 'static', keyboard: false});
                $('.modal-title').text(data['error']);
                $('#modalInput').val('');
                $('#modalButton').attr('disabled',true);
            }, 900);
        } else {
            appendChannel(data['channel']);
            $('#channelList li:last').addClass('active');
            $('#channelList li:last').click();
            inRoom=true;
            var removeHash=$('#channelList li:last').text().slice(1);
            localStorage.setItem('activeChannel',removeHash);
            $('#channelList').scrollTop(500000);
            $('#messageInput').focus();
            socket.emit('update users channels', {'channel':data['channel']});
        }
    });
   
    socket.on('update channels',data => {
        if ($('#'+data['channel']).length==0) {
            appendChannel(data['channel']);
        }
    });

    socket.on('private room',data => {
        const li=document.createElement('li');
        li.className='list-group-item active';
        $(this).siblings().removeClass('active');
        if (data['sender'] == localStorage.getItem('username')) {
            privateWindow=true;
            inRoom=false;
            $('#channelList .active').removeClass('active');
            localStorage.setItem('activeMessage',data['receiver']);
            loadPrivateMessages(data,data['receiver']);
            var receiverExist=false;
            $('#dm > li').each(function() {
                if ($(this).text().search(data['receiver']) > -1) {
                    receiverExist=true;
                }
            });
            if (!receiverExist) {
                li.innerHTML=data['receiver'];
                $('#dm').append(li);
            }
        } else {
            //if private window open
            if (privateWindow) {
                if (localStorage.getItem('activeMessage')==data['sender']) {
                    loadPrivateMessages(data,data['sender']);
                } else {
                    var senderExist=false;
                    $('#dm > li').each(function() {
                    if ($(this).text().search(data['sender']) > -1) {
                        $(this).html(data['sender']);
                        $(this).addClass('bg-warning');
                        senderExist=true;
                    }
                    });
                    if (!senderExist) {
                        li.innerHTML=data['sender'];
                        li.className='list-group-item bg-warning';
                        $('#dm').append(li);
                    }
                }
            } else {
                var senderExist=false;
                $('#dm > li').each(function() {
                    if ($(this).text().search(data['sender']) > -1) {
                        $(this).html(data['sender']);
                        $(this).addClass('bg-warning');
                        senderExist=true;
                    }
                });
                if (!senderExist) {
                    li.innerHTML=data['sender'];
                    li.className='list-group-item bg-warning';
                    $('#dm').append(li);
                }
            }
        }
        $('#dm li').on('click', function() {
        	$(this).addClass('active');
        	$(this).siblings().removeClass('active');
            $('#messageInput').focus();
            localStorage.setItem('activeMessage',$(this).text());
            $(this).removeClass('bg-warning');
            loadPrivateMessages(data,$(this).text());
            privateWindow=true;
            const username=localStorage.getItem('username');
            const time=new Date().toLocaleString();
            activeChannel=localStorage.getItem('activeChannel');
            if (activeChannel!='general' && inRoom ) {
                socket.emit('leave', {'channel':activeChannel, 'mymessage':'has left the room', 'username':username, 'time':time});
            }
            inRoom=false;
            $('#channelList .active').removeClass('active');
        });    
    });

    $('#modalInput').on('keyup', function (key) {
        if ($(this).val().length > 0 ) {
            $('#modalButton').attr('disabled',false);
            if (key.keyCode==13 ) {
                $('#modalButton').click();
            }
        }
        else {
            $('#modalButton').attr('disabled',true);
        }
    });

    $('#modalButton').on('click', function () {
        // action for new username
        if (!localStorage.getItem('username')) {    
            var username=$('#modalInput').val();
            username=username.charAt(0).toUpperCase() + username.slice(1);
            socket.emit('new username', {'username':username});
        // action for new channelname 
        } else {                                    
            var channelName=$('#modalInput').val();
            channelName=channelName.toLowerCase();
            socket.emit('new channel', {'channel':channelName});
            $('#modalCenter').modal('hide');
        }
    });
    
    //little plus icon
    $('#plus').on('click',function () {
        $('#modalCenter').modal({backdrop: 'static', keyboard: false});
        $('.modal-title').text('Please enter channel name');
        $('#modalInput').val('');
        $('#modalButton').attr('disabled',true);
        $(document).keyup(function(key) {
    	if (key.keyCode === 27){
    	$('#modalCenter').modal('hide'); 
    	}
    });
    });
    if (!localStorage.getItem('username')) {
    	$('#username').text('Flack');
    }
    else{
    	$('#username').text(localStorage.getItem('username'));
    }

});


function loadMessages(data) {
		$('#messages').html('');
        for (x in data['channels'][activeChannel]) {
            const username = data['channels'][activeChannel][x]['username'];
            const text = data['channels'][activeChannel][x]['text'];
            const time = data['channels'][activeChannel][x]['time'];        

            if (data['channels'][activeChannel][x]['username']==localStorage.getItem('username')) {
                
                const content = templateRight({'username': username, 'time':time, 'text': text});           
        		$('#messages').append(content);

            }
            else {
	            
	            const content = templateLeft({'username': username, 'time': time, 'text': text});
        		$('#messages').append(content);

            }   
            
            $('#messages').scrollTop(500000);
    }
}

function loadPrivateMessages(data,otherUser) {
    $('#messages').html('');
    for (message in data['privateMessages'][localStorage.getItem('username')][otherUser]) {

        const username = data['privateMessages'][localStorage.getItem('username')][otherUser][message]['username'];
        const text = data['privateMessages'][localStorage.getItem('username')][otherUser][message]['text'];
        const time = data['privateMessages'][localStorage.getItem('username')][otherUser][message]['time'];

        if (data['privateMessages'][localStorage.getItem('username')][otherUser][message]['username']==localStorage.getItem('username')) {

            const content = templateRight({'username': username, 'time':time, 'text': text});           
        		$('#messages').append(content);

        }else {

            const content = templateLeft({'username': username, 'time':time, 'text': text});           
        		$('#messages').append(content);

        }
        
        $('#messages').scrollTop(500000);
	}
}

function loadChannels(data) {
    for (channel in data['channels']) {
        appendChannel(channel);
    }

}
function appendChannel(channel) {
    const li=document.createElement('li');
    li.className='list-group-item';
    li.innerHTML='#'+channel.toLowerCase();
    li.setAttribute('id', channel);
    $('#channelList').append(li);
}

function chooseUser(user) {
    if (user!=localStorage.getItem('username')) {
        const username=localStorage.getItem('username');
        const time=new Date().toLocaleString();
        activeChannel=localStorage.getItem('activeChannel');
        privateWindow=true;
        inRoom=false;
        $('#messages').html('');
        localStorage.setItem('activeMessage',user);
        if (activeChannel!='general') {
            socket.emit('leave', {'channel':activeChannel, 'mymessage':'has left the room', 'username':username, 'time':time});
        }
    }else {
        
    }
    $('#messageInput').focus();
}