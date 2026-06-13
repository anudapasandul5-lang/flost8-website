import IntakeForm from '../components/IntakeForm'
import { PARTNER_FIELDS } from '../lib/intakeContract'

export default function PartnerPage() {
  return (
    <IntakeForm
      type="partner"
      fields={PARTNER_FIELDS}
      title="WORK WITH US"
      intro="Partnerships, content engine, and long-term collaboration with FLOST8."
      successTitle="REQUEST SENT"
      successMsg="We'll be in touch within 24 hours."
    />
  )
}
