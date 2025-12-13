import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Hash,
  AtSign,
  Smile,
  Paperclip,
  Reply,
  Edit2,
  Trash2,
  MessageSquare
} from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  type: string;
  code_language?: string;
  reactions: Record<string, string[]>;
  thread_id?: string;
  reply_count: number;
  edited: boolean;
  created_at: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  is_direct: boolean;
  is_private: boolean;
  last_message_at?: string;
}

interface ChatPanelProps {
  projectId: string;
  channels: Channel[];
  currentChannel: Channel | null;
  messages: Message[];
  typingUsers: string[];
  currentUserId: string;
  currentUserName: string;
  onSelectChannel: (channelId: string) => void;
  onSendMessage: (content: string, threadId?: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onSetTyping: () => void;
  onCreateChannel: (name: string, isPrivate: boolean) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '🎉', '👀', '🚀', '💯'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  channels,
  currentChannel,
  messages,
  typingUsers,
  currentUserId,
  onSelectChannel,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onSetTyping,
  onCreateChannel,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim(), replyingTo || undefined);
      setInputValue('');
      setReplyingTo(null);
    }
  };

  const handleEdit = (messageId: string) => {
    if (editValue.trim()) {
      onEditMessage(messageId, editValue.trim());
      setEditingMessage(null);
      setEditValue('');
    }
  };

  const handleCreateChannel = () => {
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim(), newChannelPrivate);
      setNewChannelName('');
      setNewChannelPrivate(false);
      setShowNewChannel(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Channels Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Channels</h3>
          <button
            onClick={() => setShowNewChannel(true)}
            className="text-gray-500 hover:text-blue-500 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Hash className="w-4 h-4" />
          </button>
        </div>

        {/* New Channel Form */}
        {showNewChannel && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Channel name"
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={newChannelPrivate}
                  onChange={(e) => setNewChannelPrivate(e.target.checked)}
                  className="rounded"
                />
                Private
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowNewChannel(false)}
                  className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
                currentChannel?.id === channel.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {channel.is_direct ? (
                <AtSign className="w-4 h-4 text-gray-400" />
              ) : (
                <Hash className="w-4 h-4 text-gray-400" />
              )}
              <span className="truncate text-sm">{channel.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {currentChannel ? (
          <>
            {/* Channel Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {currentChannel.is_direct ? (
                  <AtSign className="w-5 h-5 text-gray-400" />
                ) : (
                  <Hash className="w-5 h-5 text-gray-400" />
                )}
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {currentChannel.name}
                </h3>
              </div>
              {currentChannel.description && (
                <p className="text-sm text-gray-500 mt-1">{currentChannel.description}</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`group flex gap-3 ${
                    message.user_id === currentUserId ? '' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {message.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {message.user_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.created_at)}
                      </span>
                      {message.edited && (
                        <span className="text-xs text-gray-400">(edited)</span>
                      )}
                    </div>

                    {editingMessage === message.id ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit(message.id)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEdit(message.id)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMessage(null)}
                          className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    {/* Reactions */}
                    {Object.keys(message.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => onAddReaction(message.id, emoji)}
                            className={`px-2 py-0.5 text-sm rounded-full border ${
                              users.includes(currentUserId)
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
                                : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                            }`}
                          >
                            {emoji} {users.length}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Thread indicator */}
                    {message.reply_count > 0 && (
                      <button
                        onClick={() => setReplyingTo(message.id)}
                        className="flex items-center gap-1 mt-2 text-xs text-blue-500 hover:text-blue-600"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {message.reply_count} replies
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1">
                    <button
                      onClick={() => setShowReactions(showReactions === message.id ? null : message.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setReplyingTo(message.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                    {message.user_id === currentUserId && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMessage(message.id);
                            setEditValue(message.content);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMessage(message.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Quick Reactions Popup */}
                  {showReactions === message.id && (
                    <div className="absolute mt-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 flex gap-1">
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onAddReaction(message.id, emoji);
                            setShowReactions(null);
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2 text-xs text-gray-500">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Reply Indicator */}
            {replyingTo && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-500">Replying to thread</span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                <button className="text-gray-400 hover:text-gray-600">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    onSetTyping();
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Message #${currentChannel.name}`}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <button className="text-gray-400 hover:text-gray-600">
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a channel to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
