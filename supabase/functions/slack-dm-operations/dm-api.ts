export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to open or get DM channel with a user
export async function openDMChannel(botToken: string, userId: string) {
  console.log('Opening DM channel with user:', userId);
  
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId }),
  });

  const data = await response.json();
  if (!data.ok) {
    console.error('Failed to open DM channel:', data.error);
    throw new Error(`Failed to open DM channel: ${data.error}`);
  }

  console.log('Successfully opened DM channel:', data.channel.id);
  return data.channel.id;
}

// Send message to DM channel
export async function sendDMMessage(botToken: string, channelId: string, message: string) {
  console.log('Sending DM to channel:', channelId);
  
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: message,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('Failed to send DM:', result.error);
    throw new Error(`Failed to send DM: ${result.error}`);
  }

  console.log('DM sent successfully');
  return result;
}

// Lookup user by email or display name
export async function findUserByIdentifier(botToken: string, identifier: string) {
  console.log('Looking up user by identifier:', identifier);
  
  const response = await fetch('https://slack.com/api/users.list', {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const data = await response.json();
  if (!data.ok) {
    console.error('Failed to fetch users:', data.error);
    throw new Error(`Failed to fetch users: ${data.error}`);
  }

  // Normalize the search identifier
  const normalizedIdentifier = identifier.toLowerCase().trim();
  
  // Find user by email or display name
  const user = data.members.find(member => 
    (member.profile.email && member.profile.email.toLowerCase() === normalizedIdentifier) ||
    (member.profile.display_name && member.profile.display_name.toLowerCase() === normalizedIdentifier) ||
    (member.name && member.name.toLowerCase() === normalizedIdentifier)
  );

  if (!user) {
    throw new Error(`No user found matching "${identifier}"`);
  }

  console.log('Found matching user:', user.id);
  return user.id;
}