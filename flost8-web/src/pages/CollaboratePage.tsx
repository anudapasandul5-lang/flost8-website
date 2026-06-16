import IntakeForm from '../components/IntakeForm'
import { COLLAB_FIELDS } from '../lib/intakeContract'
import { ADMIN_EMAIL } from '../lib/config'

export default function CollaboratePage() {
  return (
    <IntakeForm
      type="collab"
      fields={COLLAB_FIELDS}
      contactEmail={ADMIN_EMAIL}
      title="BRAND DEAL COLLABORATION"
      intro="For brands, artists, venues, and partners to propose collaborations, campaigns, and creative ideas."
      successTitle="SUBMISSION SENT"
      successMsg="We'll review and reply within 24 hours."
    />
  )
}
