import '../styles/globals.css';

export const metadata = {
  title: 'LowcodeAPI',
  description: 'An API connector for third-party services.',
};

export default function RootLayout({
  children
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
