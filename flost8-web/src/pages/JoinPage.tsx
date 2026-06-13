import IntakeForm from '../components/IntakeForm'
import { JOIN_FIELDS } from '../lib/intakeContract'

export default function JoinPage() {
  return (
    <IntakeForm
      type="join"
      fields={JOIN_FIELDS}
      title="JOIN THE ROSTER"
      intro="We don't take everyone. We build the right ones."
      successTitle="APPLICATION SENT"
      successMsg="If it's a fit, we'll reach out."
    />
  )
}
