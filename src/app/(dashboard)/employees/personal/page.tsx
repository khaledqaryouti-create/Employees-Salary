import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { PersonalSearch } from './personal-search'

export default async function EmployeesPersonalPage() {
  await getProfileOrRedirect()
  return <PersonalSearch />
}
