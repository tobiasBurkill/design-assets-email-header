// Vercel Function - Email Header Generator
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientName, industry, territory } = req.body;

    // Validate required fields
    if (!clientName || !industry || !territory) {
      return res.status(400).json({ 
        error: 'Missing required fields: clientName, industry, and territory' 
      });
    }

    // Your Figma configuration
    const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
    const FILE_KEY = process.env.FIGMA_FILE_KEY;
    const COMPONENT_KEY = process.env.FIGMA_COMPONENT_KEY;
    
    // Step 1: Get the component from your library
    const componentResponse = await fetch(
      `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${COMPONENT_KEY}`,
      {
        headers: {
          'X-Figma-Token': FIGMA_TOKEN,
        },
      }
    );

    if (!componentResponse.ok) {
      throw new Error('Failed to fetch Figma component');
    }

    const componentData = await componentResponse.json();

    // Step 2: Export the result as image
    const exportResponse = await fetch(
      `https://api.figma.com/v1/images/${FILE_KEY}?ids=${COMPONENT_KEY}&format=png&scale=2`,
      {
        headers: {
          'X-Figma-Token': FIGMA_TOKEN,
        },
      }
    );

    const exportData = await exportResponse.json();
    const imageUrl = exportData.images[COMPONENT_KEY];

    // Step 3: Send email with result
    await sendEmailWithHeader(req.body.email, clientName, industry, territory, imageUrl);

    return res.status(200).json({
      success: true,
      message: 'Email header generated successfully',
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Error generating header:', error);
    return res.status(500).json({ 
      error: 'Failed to generate email header',
      details: error.message 
    });
  }
}

// Email function using Resend
async function sendEmailWithHeader(email, clientName, industry, territory, imageUrl) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'headers@phmg.com',
      to: email,
      subject: `Email Header Ready - ${clientName}`,
      html: `
        <h2>Your email header is ready!</h2>
        <p><strong>Client:</strong> ${clientName}</p>
        <p><strong>Industry:</strong> ${industry}</p>
        <p><strong>Territory:</strong> ${territory}</p>
        <p>Download your header:</p>
        <img src="${imageUrl}" alt="Email Header" style="max-width: 600px;">
        <p><a href="${imageUrl}" download>Download PNG</a></p>
      `,
    }),
  });

  return emailResponse.json();
}
