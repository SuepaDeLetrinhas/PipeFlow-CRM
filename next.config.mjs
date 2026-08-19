/**
 * Cabeçalhos de segurança.
 *
 * Aplicados aqui, e não no middleware, por dois motivos: o middleware não roda
 * em asset estático (o `matcher` os exclui de propósito), e uma resposta
 * servida do cache do Next pode não passar por ele. `headers()` é avaliado pela
 * borda em toda resposta, inclusive nas cacheadas.
 *
 * Não há CSP nesta lista. Uma política honesta para este app precisa de nonce
 * por request — o Next injeta script inline de hidratação, e o Stripe carrega
 * script próprio no checkout —, e nonce exige gerar o valor no middleware e
 * repassá-lo ao `<head>`. Uma CSP com `'unsafe-inline'` seria só um cabeçalho
 * bonito no relatório: ela não barra o XSS que diz barrar. Fica como trabalho
 * explícito, não como omissão silenciosa.
 */
const securityHeaders = [
  // O app nunca é legítimo dentro de um iframe: não há widget embutível aqui, e
  // o que existe são botões que movem dinheiro e apagam dados — exatamente o
  // alvo de um clickjacking sobreposto.
  { key: "X-Frame-Options", value: "DENY" },

  // Impede o navegador de adivinhar o tipo de um arquivo pelo conteúdo. Sem
  // isso um upload servido como texto pode ser reinterpretado como script.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // O caminho completo vaza contexto para terceiros: `/leads/<uuid>` no
  // Referer entrega o id do lead a qualquer host externo que a página chame.
  // Só a origem viaja para fora; navegação interna mantém a URL inteira.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Nenhuma dessas capacidades é usada pelo app. Negá-las explicitamente é o
  // que impede um script de terceiro de pedi-las em nome do domínio.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // HSTS: o navegador passa a recusar HTTP neste domínio antes mesmo de sair
  // da máquina, fechando a janela de downgrade do primeiro acesso. Dois anos e
  // `includeSubDomains` são o que o preload exige.
  //
  // Só vale em produção: em `localhost` o cabeçalho grudaria no navegador do
  // desenvolvedor e passaria a exigir HTTPS de todo projeto servido na mesma
  // origem — um estrago local difícil de diagnosticar depois.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove o `X-Powered-By: Next.js`. Não é uma defesa — a versão vaza por
  // outros caminhos —, mas também não há razão para anunciá-la.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
