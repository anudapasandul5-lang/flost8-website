import FormRenderer from './FormRenderer'
import {
  emptyIntakeForm,
  validateIntake,
  buildIntakePayload,
  type IntakeFieldDef,
  type IntakeType,
} from '../lib/intakeContract'

export interface IntakeFormProps {
  type: IntakeType
  fields: IntakeFieldDef[]
  title: string
  intro: string
  successTitle: string
  successMsg: string
  contactEmail?: string
}

export default function IntakeForm({ type, fields, title, intro, successTitle, successMsg, contactEmail }: IntakeFormProps) {
  return (
    <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] pt-32 outline-none">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <FormRenderer
          fields={fields}
          initialData={emptyIntakeForm(fields)}
          validate={data => validateIntake(fields, data)}
          buildPayload={(data, token) => buildIntakePayload(type, data, token)}
          title={title}
          intro={intro}
          successTitle={successTitle}
          successMsg={successMsg}
          contactEmail={contactEmail}
        />
      </div>
    </main>
  )
}
