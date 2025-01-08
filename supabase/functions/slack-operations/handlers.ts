import { getSlackAccount } from './db.ts';
import { getSlackChannel, sendSlackMessage, fetchSlackMessages } from './slack-api.ts';

export async function handleSendMessage(slackAccountId: string, channelName: string, message: string) {
  if (!message) {
    throw new Error('Message is required');
  }

  if (!channelName) {
    throw new Error('Channel name is required');
  }

  console.log('Starting handleSendMessage:', { slackAccountId, channelName, message });

  const slackAccount = await getSlackAccount(slackAccountId);
  console.log('Retrieved slack account:', { 
    hasToken: !!slackAccount.slack_bot_token,
    accountId: slackAccountId 
  });

  const channel = await getSlackChannel(slackAccount.slack_bot_token, channelName);
  console.log('Retrieved channel:', { 
    channelId: channel.id,
    channelName: channel.name,
    isMember: channel.is_member 
  });

  await sendSlackMessage(slackAccount.slack_bot_token, channel.id, message);
  console.log('Message sent successfully');

  return { message: 'Message sent successfully' };
}

export async function handleFetchMessages(slackAccountId: string, channelName: string, count: number, fetchMentions: boolean) {
  const slackAccount = await getSlackAccount(slackAccountId);
  const channel = await getSlackChannel(slackAccount.slack_bot_token, channelName);
  
  let messages = await fetchSlackMessages(slackAccount.slack_bot_token, channel.id, count);

  if (fetchMentions) {
    messages = messages
      .filter((msg: any) => msg.text.includes('@'))
      .slice(0, count);
  } else {
    messages = messages.slice(0, count);
  }

  console.log(`Successfully fetched ${messages.length} ${fetchMentions ? 'mentions' : 'messages'}`);
  return { messages: messages.map((msg: any) => msg.text) };
}