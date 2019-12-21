let receiverId = null; // personal ID or group ID
const senderId = $('#chatInputField').data('uid');
const senderName = $('#chatInputField').data('uname');
const senderAvatar = $('#chatInputField').data('ava');
let receiverAvatar = null;
let messageType = null;
let allMessages = [];
let typingMessages = [];

function appendMessagesToView(messages){
  messages.forEach(function(message){
    let messageElement = '';
    if (message.groupId){
      if (senderId == message.senderId._id){
        messageElement = 
        `<div class="line-chat">
          <div id="message" class="bubble me">
            ${message.text}
          </div>
        </div>`;
      } else {
        messageElement = `<div class="line-chat">
        <div><tag>${message.senderId.username}</tag></div>
      <div class="avatar-of-user-chatting">
        <img src="../../images/users/${message.senderId.avatar}" alt="" />
      </div>
      <div id="message" class="bubble you">
        ${message.text}
      </div>
    </div>`;
      }
    }else if (senderId == message.senderId && receiverId == message.receiverId){
      messageElement = `<div class="line-chat">
      <div id="message" class="bubble me">
        ${message.text}
      </div>
    </div>`;
    } else if (senderId == message.receiverId && receiverId == message.senderId) {
      messageElement = `<div class="line-chat">
      <div class="avatar-of-user-chatting">
        <img src="${receiverAvatar}" alt="" />
      </div>
      <div id="message" class="bubble you">
        ${message.text}
      </div>
    </div>`;
    }
    $('#chat-field').append(messageElement);
    $('#chat-field')
      .stop()
      .animate({
        scrollTop: $('#chat-field')[0].scrollHeight
      });
  });
}

function getMessages(){
  if (!allMessages[receiverId]){
    $.get(`/get-messages?senderId=${senderId}&receiverId=${receiverId}&type=${messageType}`, function(data, status){
      allMessages[receiverId] = data.messages;
      appendMessagesToView(allMessages[receiverId]);
    });
  }else{
    appendMessagesToView(allMessages[receiverId]);
  }
};

function focusReceiver(id){
  receiverId = id;
  messageType = $(`#li-${id}`).attr('class');
  receiverAvatar = $(`#li-${id}`)
      .find('img')
      .attr('src');
  $('#contact-list li').css('background-color', 'white');
  $(`#li-${id}`).css('background-color', '#e6e6e6');
  $('#nameOfReceiver').text(
    $(`#li-${id}`)
      .find('span.name')
      .text()
  );
  $('#chat-field').empty();
  getMessages();
}

function selectReceiver() {
  $(document).on('click', '#contact-list li', function() {
    if ($('.write-chat')[0].emojioneArea.getText() !== ''){
      typingMessages[receiverId] = $('.write-chat')[0].emojioneArea.getText();
    }
    receiverId = $(this).data('uid');
    if (typingMessages[receiverId]){
      $('.write-chat')[0].emojioneArea.setText(typingMessages[receiverId]);
    }else{
      $('.write-chat')[0].emojioneArea.setText('');
    }
    focusReceiver(receiverId);
  });
}

function selectReceiverFromModal(){
  $(document).on('click', '.user-talk', function() {
    $('#contactsModal').modal('toggle');
    receiverId = $(this).data('uid');
    focusReceiver(receiverId);
  });
}

function findConversationBySearchBox(){
  $('.searchBox').on("keyup", function () {
    if (this.value.length > 0) {   
      $('#contact-list li').hide().filter(function () {
        return $(this).find('span.name').text().toLowerCase().indexOf($('.searchBox').val().toLowerCase()) != -1;
      }).show(); 
    }  
    else { 
      $('#contact-list li').show();
    }
    if ($('#contact-list li:visible').length > 0){
      receiverId = $('#contact-list li:visible').first().data('uid');
      focusReceiver(receiverId);
    } 
  }); 
}

function onEnter() {
  let message = $('#chatInputField').val();
  if (message.length > 0 && messageType == 'person'){
    const data = {
      createdAt: new Date().getTime(),
      senderId: senderId,
      receiverId: receiverId,
      messageContent: message
    };
    socket.emit('send-message', data);
  }else if (message.length > 0 && messageType == 'group') {
    const data = {
      createdAt: new Date().getTime(),
      senderId: {
        _id: senderId,
        avatar: senderAvatar,
        username: senderName
      },
      groupId: receiverId,
      text: message
    }
    socket.emit('send-group-message', data);
  }
  delete typingMessages[receiverId];
}

function updateSenderMessageBox() {
  socket.on('update-sender-message-box', function(message) {
    allMessages[receiverId].push(message);
    const messageElement = `<div class="line-chat">
		<div id="message" class="bubble me">
			${message.text}
		</div>
	</div>`;
    $('#chat-field').append(messageElement);
    $('#chat-field')
      .stop()
      .animate({
        scrollTop: $('#chat-field')[0].scrollHeight
      });
    $('#chatInputField').val('');
    const receiverLeftTag = $(`#li-${receiverId}`).prop('outerHTML');
    $(`#li-${receiverId}`).remove();
    $('#contact-list').prepend(receiverLeftTag);
    $(`#li-${receiverId}`).find('span.preview').text('Bạn: ' + message.text);
    $(`#li-${receiverId}`).find('span.time').attr('data-createAt', message.createdAt);
    reCalculateTimeAgo();
  });
}

function receiveMessage() {
  socket.on('receive-message', function(message) {
    if (allMessages[message.senderId]) {
      allMessages[message.senderId].push(message);
    } else {
      getMessages();
    }
    if (message.senderId == receiverId){
      const messageElement = `<div class="line-chat">
      <div class="avatar-of-user-chatting">
        <img src="${receiverAvatar}" alt="" />
      </div>
      <div id="message" class="bubble you">
        ${message.text}
      </div>
    </div>`;
      $('#chat-field').append(messageElement);
      $('#chat-field')
        .stop()
        .animate({
          scrollTop: $('#chat-field')[0].scrollHeight
        });
    }
    const receiverLeftTag = $(`#li-${message.senderId}`).prop('outerHTML');
    $(`#li-${message.senderId}`).remove();
    $('#contact-list').prepend(receiverLeftTag);
    $(`#li-${message.senderId}`).find('span.preview').text(message.text);
    $(`#li-${message.senderId}`).find('span.time').attr('data-createAt', message.createdAt);
    reCalculateTimeAgo();
  });
  socket.on('receive-group-message', function(data){
    if (allMessages[data.groupId]) {
      allMessages[data.groupId].push(data);
    } else {
      getMessages();
    }
    if (data.groupId == receiverId){
      const messageElement = `<div class="line-chat">
      <div><tag>${data.senderId.username}</tag></div>
      <div class="avatar-of-user-chatting">
        <img src="../../images/users/${data.senderId.avatar}" alt="" />
      </div>
      <div id="message" class="bubble you">
        ${data.text}
      </div>
    </div>`;
      $('#chat-field').append(messageElement);
      $('#chat-field')
        .stop()
        .animate({
          scrollTop: $('#chat-field')[0].scrollHeight
        });
    }
    const receiverLeftTag = $(`#li-${data.groupId}`).prop('outerHTML');
    $(`#li-${data.groupId}`).remove();
    $('#contact-list').prepend(receiverLeftTag);
    $(`#li-${data.groupId}`).find('span.preview').text(`${data.senderId.username}: ${data.text}`);
    $(`#li-${data.groupId}`).find('span.time').attr('data-createAt', data.createdAt);
    reCalculateTimeAgo();
  });
}

function init(){
  receiverId = $('#contact-list li')
    .first()
    .data('uid');
  focusReceiver(receiverId);
}

function calculateTimeAgo(time){
  const secondsAgo = (new Date().getTime() - time)/1000;
  if (parseInt(secondsAgo) === 0) {
    return `Vừa xong`;
  } else if (secondsAgo < 60){
    return `${parseInt(secondsAgo)} giây trước`;
  }else if (secondsAgo < 3600){
    return `${parseInt(secondsAgo/60)} phút trước`;
  }else if (secondsAgo < 86400){
    return `${parseInt(secondsAgo/3600)} giờ trước`;
  }else{
    const timeAgo = parseInt(secondsAgo/86400);
    if (timeAgo < 7){
      return `${timeAgo} ngày trước`;
    }
    return `Từ ${new Date(time).toLocaleDateString()}`;
  }
}

function reCalculateTimeAgo(){
  $('#contact-list li').each(function(){
    const liId = $(this).data('uid');
    const time = $(`#li-${liId}`).find('span.time').attr('data-createAt');
    if (time){
      $(`#li-${liId}`).find('span.time').text(calculateTimeAgo(time));
    }
  });
}

function getAllContact() {
  $.get(`/get-all-contacts`, function(data, status){
    data.usersAndGroups.forEach(function(item){
      let element = ``;
      if (item.user) {
        element += `<li
          id="li-${item.user._id}"
          class="person"
          data-uid="${item.user._id}">
          <div class="left-avatar">
            <div class="dot"></div>
            <img src="../../images/users/${item.user.avatar}" alt="" />
          </div>
          <span class="name">
          ${item.user.username}
          </span>
          <span class="time" data-createAt="`;
        if (item.latestMessage.createdAt) {
          element += `${item.latestMessage.createdAt}">${calculateTimeAgo(item.latestMessage.createdAt)}</span>`;
        } else {
          element += `"></span>`;
        }
        element += `<span class="preview">`;
        if (item.latestMessage.sender) {
          if (senderId == item.latestMessage.sender) {
            element += `Bạn: `;
          }
        }
        if (item.latestMessage.content) {
          element += `${item.latestMessage.content}`;
        }
        element += `</span></li>`;
      }else{
        element += `<li
          id="li-${item._id}"
          class="group"
          data-uid="${item._id}">
          <div class="left-avatar">
            <div class="dot"></div>
            <img src="../../images/users/group.png" alt="" />
          </div>
          <span class="name">
          ${item.name}
          </span>
          <span class="time" data-createAt="`;
        if (item.latestMessage) {
          element += `${item.latestMessage.createdAt}">${calculateTimeAgo(item.latestMessage.createdAt)}</span>`;
        } else {
          element += `"></span>`;
        }
        element += `<span class="preview">`;
        if (item.latestMessage) {
          if (senderId == item.latestMessage.sender._id) {
            element += `Bạn: `;
          } else {
            element += `${item.latestMessage.sender.username}: `;
          }
        }
        if (item.latestMessage) {
          element += `${item.latestMessage.content}`;
        }
        element += `</span><button class="get-group-info-btn" data-gid="${item._id}"><i class="fa fa-cog"></i></button></span>`;
        element += `</span><button class="add-user-to-group"  data-gid="${item._id}"><i class="fa fa-plus-circle"></i></button></span>`;
      }
      $('#contact-list').append(element);
    });
    init();
  });
}

function enableEmojioneAreaAndChat() {
  $('.write-chat').emojioneArea({
    standalone: false,
    pickerPosition: 'top',
    filtersPosition: 'bottom',
    tones: false,
    autocomplete: false,
    inline: true,
    hidePickerOnBlur: true,
    search: false,
    shortnames: false,
    events: {
      keyup: function(selector, event) {
        const text = this.getText();
        if (event.keyCode === 13 && text !== ''){
          $('.write-chat').val(text);
          onEnter();
          this.setText('');
        }
      },
      click: function(){
        this.hidePicker();
      },
      button_click: function(){
        
      }
    }
  });
}

//send image
function sendImage(){
  $('#image-chat').bind('change', function() {
    const imageData = $(this).prop('files')[0];
    const match = ['image/png', 'image/jpg', 'image/jpeg'];
    const limit = 1048576; // 1 MB

    if ($.inArray(imageData.type, match) === -1) {
      alertify.notify('Kiểu file không hợp lệ!', 'error', 7);
      $(this).val(null);
      return false;
    }
    if (imageData.size > limit) {
      alertify.notify('Dung lượng ảnh tối đa 1 MB!', 'error', 7);
      $(this).val(null);
      return false;
    }
    let messageData = new FormData();
    // let fileReader = new FileReader();
    // fileReader.readAsDataURL(imageData);
    // console.log(fileReader);
    // fileReader.onload = function(element){
    //   console.log('abc', element.target.result);
    // }
    
    if (messageType == 'person'){
      messageData.append('image', imageData);
      messageData.append('receiverId', receiverId);
      socket.emit('send-image', messageData);
    }else if (messageType == 'group'){
      messageData.append('image', imageData);
      messageData.append('groupId', receiverId);
      socket.emit('send-image-to-group', messageData);
    } 
  });
}

$(document).ready(function() {
  getAllContact();
  enableEmojioneAreaAndChat();
  selectReceiver();
  selectReceiverFromModal();
  updateSenderMessageBox();
  receiveMessage();
  findConversationBySearchBox();
  sendImage();
});
