// Helper to generate Brazilian Central Bank (BACEN) compliant PIX BR Code payload

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePixPayload({
  chave,
  valor,
  nomeRecebedor = 'FLUC CONTROLE FINANCEIRO',
  cidade = 'BRASILIA',
  descricao = ''
}: {
  chave: string;
  valor?: number;
  nomeRecebedor?: string;
  cidade?: string;
  descricao?: string;
}): string {
  // Clean chave
  const cleanKey = chave.trim();
  
  // Format Merchant Account Information (ID 26)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const keyField = formatField('01', cleanKey);
  const descField = descricao ? formatField('02', descricao.substring(0, 40)) : '';
  const merchantAccountInfo = formatField('26', `${gui}${keyField}${descField}`);

  // Sanitize name and city (remove accents, max lengths)
  const sanitize = (text: string) => 
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();

  const cleanName = sanitize(nomeRecebedor || 'RECEBEDOR').substring(0, 25) || 'RECEBEDOR';
  const cleanCity = sanitize(cidade || 'BRASILIA').substring(0, 15) || 'BRASILIA';

  const payloadFormat = formatField('00', '01');
  const merchantCategory = formatField('52', '0000');
  const currency = formatField('53', '986'); // BRL
  const amountField = (valor && valor > 0) ? formatField('54', valor.toFixed(2)) : '';
  const country = formatField('58', 'BR');
  const nameField = formatField('59', cleanName);
  const cityField = formatField('60', cleanCity);
  const additionalData = formatField('62', formatField('05', '***'));

  const rawPayload = `${payloadFormat}${merchantAccountInfo}${merchantCategory}${currency}${amountField}${country}${nameField}${cityField}${additionalData}6304`;
  const checksum = crc16(rawPayload);

  return `${rawPayload}${checksum}`;
}
