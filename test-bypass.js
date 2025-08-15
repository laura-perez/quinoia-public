/**
 * Test simple pour vérifier le bypass reCAPTCHA
 */
import { verifyAndExtractRecaptcha } from '@/lib/auth/recaptcha'

async function testBypass() {
  console.log('NODE_ENV:', process.env.NODE_ENV)
  
  try {
    const result = await verifyAndExtractRecaptcha('test_token_valid')
    console.log('Bypass result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error)
  }
}

testBypass()
