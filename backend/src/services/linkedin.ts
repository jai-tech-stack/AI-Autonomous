import axios from 'axios';

export async function postToLinkedIn(params: {
  accessToken: string;
  authorUrn: string; // e.g. urn:li:person:XXXX or urn:li:organization:XXXX
  text: string;
}) {
  const url = 'https://api.linkedin.com/v2/ugcPosts';
  const body = {
    author: params.authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: params.text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
  });

  return res.data;
}


