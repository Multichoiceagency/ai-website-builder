<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Invitation, Role, TeamMember } from '@platform/schemas'

/**
 * Team (§59).
 *
 * What a role can do is read from the server's own permission engine rather
 * than restated here — a hard-coded capability list is a lie waiting to happen
 * the first time a permission moves between roles.
 */
interface TeamResponse {
  members: TeamMember[]
  invitations: Invitation[]
  limits: { users: number }
  roles: { role: Role; permissions: string[] }[]
}

const api = useApi()
const session = useSession()
const can = useCan()

const { data, refresh } = await useAsyncData('settings:team', () =>
  api.get<TeamResponse>('/api/v1/settings/team'),
)

const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<Role>('viewer')
const inviteBusy = ref(false)
const inviteError = ref('')

const roleOptions = computed(() =>
  (data.value?.roles ?? []).map((entry) => ({
    label: entry.role.replace('_', ' '),
    value: entry.role,
  })),
)

const pendingInvitations = computed(() =>
  (data.value?.invitations ?? []).filter((entry) => !entry.acceptedAt && !entry.revokedAt),
)

const seatsUsed = computed(() => (data.value?.members.length ?? 0) + pendingInvitations.value.length)
const seatLimit = computed(() => data.value?.limits.users ?? 0)
const seatsFull = computed(() => seatsUsed.value >= seatLimit.value)

/** The permission list for one role, straight from the server's resolution. */
function permissionsFor(role: Role): string[] {
  return data.value?.roles.find((entry) => entry.role === role)?.permissions ?? []
}

const expandedRole = ref<Role | null>(null)

async function invite() {
  inviteBusy.value = true
  inviteError.value = ''
  try {
    await api.post('/api/v1/settings/team/invitations', {
      email: inviteEmail.value.trim(),
      role: inviteRole.value,
    })
    inviteEmail.value = ''
    inviteOpen.value = false
    await refresh()
  } catch (cause) {
    inviteError.value = cause instanceof ApiError ? cause.message : 'Could not send that invitation.'
  } finally {
    inviteBusy.value = false
  }
}

const roleChange = ref<{ member: TeamMember; role: Role } | null>(null)
const roleChangeBusy = ref(false)
const roleChangeError = ref('')

async function applyRoleChange() {
  if (!roleChange.value) return

  roleChangeBusy.value = true
  roleChangeError.value = ''
  try {
    await api.patch(`/api/v1/settings/team/members/${roleChange.value.member.userId}`, {
      role: roleChange.value.role,
      confirm: true,
    })
    roleChange.value = null
    await refresh()
  } catch (cause) {
    roleChangeError.value = cause instanceof ApiError ? cause.message : 'Could not change that role.'
  } finally {
    roleChangeBusy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="rounded-card border border-line bg-raised">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 class="type-button text-ink">People</h2>
          <p class="type-caption-12 mt-1 text-soft">
            {{ seatsUsed }} of {{ seatLimit }} seat{{ seatLimit === 1 ? '' : 's' }} in use.
          </p>
        </div>
        <UiButton
          v-if="can('member:invite')"
          size="sm"
          variant="primary"
          :disabled="seatsFull"
          :title="seatsFull ? 'Your plan has no free seats. Upgrade to invite more people.' : undefined"
          @click="inviteOpen = true"
        >
          Invite someone
        </UiButton>
      </header>

      <ul class="divide-y divide-line">
        <li
          v-for="member in data?.members ?? []"
          :key="member.userId"
          class="flex flex-wrap items-center gap-3 px-5 py-3"
        >
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken type-button-12 text-soft"
            aria-hidden="true"
          >
            {{ member.name.charAt(0).toUpperCase() }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="type-button-12 truncate text-ink">
              {{ member.name }}
              <span v-if="member.userId === session?.user.id" class="text-faint">· you</span>
            </p>
            <p class="type-caption-12 truncate text-faint">{{ member.email }}</p>
          </div>

          <button
            type="button"
            class="type-button-12 rounded-full bg-sunken px-2.5 py-1 capitalize text-soft transition-colors hover:text-ink"
            @click="expandedRole = expandedRole === member.role ? null : member.role"
          >
            {{ member.role.replace('_', ' ') }}
            <span class="text-faint">· {{ member.permissions.length }} permissions</span>
          </button>

          <div v-if="can('member:manage')" class="flex items-center gap-1.5">
            <select
              class="h-8 rounded-md border border-line bg-raised px-2 type-button-12 text-ink"
              :value="member.role"
              :aria-label="`Role for ${member.name}`"
              @change="roleChange = { member, role: ($event.target as HTMLSelectElement).value as Role }"
            >
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <SettingsDangerAction
              title="Remove from workspace"
              :description="`${member.name} loses access immediately. Their content stays.`"
              action-label="Remove"
              method="DELETE"
              :path="`/api/v1/settings/team/members/${member.userId}`"
              @done="refresh()"
            />
          </div>
        </li>
      </ul>

      <!-- Expanded on demand: eleven permission chips per row would drown the
           list, but "what can a marketer actually do?" must still be answerable. -->
      <div v-if="expandedRole" class="border-t border-line bg-sunken/40 px-5 py-4">
        <p class="type-caption mb-2 capitalize text-ink">{{ expandedRole.replace('_', ' ') }} can</p>
        <ul class="flex flex-wrap gap-1.5">
          <li v-for="permission in permissionsFor(expandedRole)" :key="permission">
            <UiBadge>{{ permission }}</UiBadge>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="pendingInvitations.length" class="rounded-card border border-line bg-raised">
      <header class="border-b border-line px-5 py-4">
        <h2 class="type-button text-ink">Pending invitations</h2>
      </header>
      <ul class="divide-y divide-line">
        <li
          v-for="invitation in pendingInvitations"
          :key="invitation.id"
          class="flex flex-wrap items-center gap-3 px-5 py-3"
        >
          <div class="min-w-0 flex-1">
            <p class="type-button-12 truncate text-ink">{{ invitation.email }}</p>
            <p class="type-caption-12 text-faint">
              Invited as {{ invitation.role.replace('_', ' ') }} · expires
              {{ new Date(invitation.expiresAt).toLocaleDateString() }}
            </p>
          </div>
          <UiButton
            v-if="can('member:manage')"
            size="sm"
            variant="ghost"
            @click="api.del(`/api/v1/settings/team/invitations/${invitation.id}`).then(() => refresh())"
          >
            Revoke
          </UiButton>
        </li>
      </ul>
    </section>

    <UiDialog
      v-model:open="inviteOpen"
      title="Invite someone"
      description="They receive a link by e-mail. The link expires in seven days."
    >
      <div class="flex flex-col gap-4">
        <UiField label="E-mail address" required :error="inviteError">
          <template #default="{ id, describedBy }">
            <UiInput :id="id" v-model="inviteEmail" type="email" :described-by="describedBy" />
          </template>
        </UiField>

        <UiField label="Role" help="You can change this later.">
          <template #default="{ id }">
            <UiSelect :id="id" v-model="inviteRole" :options="roleOptions" />
          </template>
        </UiField>

        <div v-if="inviteRole" class="rounded-lg border border-line bg-sunken/50 p-3">
          <p class="type-caption-12 mb-2 text-soft">This role grants</p>
          <ul class="flex flex-wrap gap-1">
            <li v-for="permission in permissionsFor(inviteRole)" :key="permission">
              <UiBadge>{{ permission }}</UiBadge>
            </li>
          </ul>
        </div>
      </div>

      <template #footer>
        <UiButton size="sm" @click="inviteOpen = false">Cancel</UiButton>
        <UiButton size="sm" variant="primary" :loading="inviteBusy" @click="invite">Send invitation</UiButton>
      </template>
    </UiDialog>

    <UiDialog
      :open="roleChange !== null"
      title="Change role"
      :description="
        roleChange
          ? `${roleChange.member.name} becomes ${roleChange.role.replace('_', ' ')}. This is recorded in the audit log.`
          : ''
      "
      @update:open="(value: boolean) => { if (!value) roleChange = null }"
    >
      <div v-if="roleChange" class="flex flex-col gap-3">
        <p class="type-caption-12 text-soft">Their permissions become:</p>
        <ul class="flex flex-wrap gap-1">
          <li v-for="permission in permissionsFor(roleChange.role)" :key="permission">
            <UiBadge>{{ permission }}</UiBadge>
          </li>
        </ul>
        <p v-if="roleChangeError" class="type-caption-12 text-danger" role="alert">{{ roleChangeError }}</p>
      </div>

      <template #footer>
        <UiButton size="sm" @click="roleChange = null">Cancel</UiButton>
        <UiButton size="sm" variant="primary" :loading="roleChangeBusy" @click="applyRoleChange">
          Change role
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
