
export const msalConfig = {
    auth: {
        clientId: '4dc31f4a-634b-4360-b6ef-4ebc83b21f21', // This is the ONLY mandatory field that you need to supply.
        authority: 'https://login.microsoftonline.com/87e450d8-9ee3-4538-a4b3-3cb61e605824', // Replace the placeholder with your tenant info
        redirectUri: 'http://localhost:5173'
    }
};

export const loginRequest = {
    scopes: ["api://62599e34-c893-4653-92c2-218aeb8c3741/access_as_user"]
};