async function testLogin(email, password) {
  const credentials = {
    email: email,
    password: password
  };

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    console.log(`Testing with email: ${email}, password: ${password}`);
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('---');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  await testLogin('valid@example.com', 'short'); // Should show password error
  await testLogin('invalid-email', 'password123'); // Should show email error
  await testLogin('valid@example.com', 'password123'); // Should show invalid credentials (since user doesn't exist)
}

runTests();
