import "notyf/notyf.min.css";
import "../renderer/styles.input.css";

export const metadata = {
  title: "Origin"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
