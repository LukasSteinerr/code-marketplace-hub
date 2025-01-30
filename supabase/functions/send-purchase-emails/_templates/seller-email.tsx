import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface SellerEmailProps {
  gameTitle: string;
  price: number;
  buyerEmail: string;
}

export const SellerEmail = ({
  gameTitle,
  price,
  buyerEmail,
}: SellerEmailProps) => (
  <Html>
    <Head />
    <Preview>Your game code for {gameTitle} has been sold!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Congratulations on your sale!</Heading>
        <Text style={text}>
          Your game code for {gameTitle} has been purchased.
        </Text>
        <Text style={text}>
          Sale Details:<br />
          Game: {gameTitle}<br />
          Price: ${price}<br />
          Buyer Email: {buyerEmail}
        </Text>
        <Text style={text}>
          The payment will be processed and transferred to your account according to our standard payout schedule.
        </Text>
        <Text style={footer}>
          Thank you for selling on our platform!
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

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0',
}

export default SellerEmail;