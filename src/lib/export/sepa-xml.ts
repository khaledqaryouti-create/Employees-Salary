/**
 * SEPA Credit Transfer XML generator (pain.001.001.03).
 * Used for salary payments in Italy and other Eurozone countries.
 */

export interface SEPATransaction {
  employeeName: string
  iban: string
  bic?: string
  amount: number
  currency: string
  reference: string
  remittanceInfo?: string
}

export interface SEPAInitiation {
  messageId: string
  creationDate: Date
  debitorName: string
  debitorIBAN: string
  debitorBIC: string
  transactions: SEPATransaction[]
  currency?: string
}

function xmlEscape(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0] ?? ''
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

/**
 * Generates a SEPA pain.001.001.03 XML document for salary credit transfers.
 */
export function generateSEPAXML(initiation: SEPAInitiation): string {
  const totalAmount = initiation.transactions.reduce((s, t) => s + t.amount, 0)
  const currency = initiation.currency ?? 'EUR'
  const msgId = xmlEscape(initiation.messageId)
  const creationDt = formatDateTime(initiation.creationDate)
  const reqExecDt = formatDate(initiation.creationDate)
  const count = initiation.transactions.length

  const txLines = initiation.transactions.map((tx) => `    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>${xmlEscape(tx.reference)}</EndToEndId>
      </PmtId>
      <Amt>
        <InstdAmt Ccy="${xmlEscape(currency)}">${tx.amount.toFixed(2)}</InstdAmt>
      </Amt>
      ${tx.bic ? `<CdtrAgt><FinInstnId><BIC>${xmlEscape(tx.bic)}</BIC></FinInstnId></CdtrAgt>` : ''}
      <Cdtr>
        <Nm>${xmlEscape(tx.employeeName)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${xmlEscape(tx.iban)}</IBAN></Id>
      </CdtrAcct>
      ${tx.remittanceInfo ? `<RmtInf><Ustrd>${xmlEscape(tx.remittanceInfo)}</Ustrd></RmtInf>` : ''}
    </CdtTrfTxInf>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 pain.001.001.03.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creationDt}</CreDtTm>
      <NbOfTxs>${count}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${xmlEscape(initiation.debitorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-PMT</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${count}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${reqExecDt}</ReqdExctnDt>
      <Dbtr>
        <Nm>${xmlEscape(initiation.debitorName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${xmlEscape(initiation.debitorIBAN)}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId><BIC>${xmlEscape(initiation.debitorBIC)}</BIC></FinInstnId>
      </DbtrAgt>
${txLines}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
}
