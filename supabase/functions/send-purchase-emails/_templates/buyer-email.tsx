import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface BuyerEmailProps {
  gameTitle: string;
  gameCode: string;
  platform: string;
  price: number;
}

export const BuyerEmail = ({
  gameTitle,
  gameCode,
  platform,
  price,
}: BuyerEmailProps) => (
  <Html>
    <Head />
    <Preview>Your game code purchase for {gameTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thank you for your purchase!</Heading>
        <Text style={text}>
          Here are your game code details for {gameTitle}:
        </Text>
        <Text style={codeContainer}>
          Your code: <code style={code}>{gameCode}</code>
        </Text>
        <Text style={text}>
          Platform: {platform}<br />
          Price: ${price}
        </Text>
        <Text style={text}>
          Please redeem your code as soon as possible and verify that it works.
        </Text>
        <Text style={footer}>
          If you encounter any issues, please contact our support team.
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0',
}

const codeContainer = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#f4f4f4',
  borderRadius: '4px',
}

const code = {
  color: '#000',
  display: 'block',
  fontSize: '20px',
  fontFamily: 'monospace',
  fontWeight: 'bold',
  margin: '8px 0',
}

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0',
}

export default BuyerEmail;