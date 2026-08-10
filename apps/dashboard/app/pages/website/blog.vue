<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  BlockMetadata,
  BlogAuthor,
  BlogCategory,
  BlogPost,
  BlogPostRevision,
  BlogPostSummary,
  MediaAsset,
} from '@platform/schemas'

/**
 * The blog.
 *
 * A post is a page under a different address: the body is the same section
 * document, drawn from the same block registry, published through the same
 * draft → revision → live path. The screen leans on that rather than hiding
 * it — the status column reads the way the pages list does, and scheduling is
 * presented as "when does the live version count", not as a fourth state.
 */
const api = useApi()
const can = useCan()
const config = useRuntimeConfig()
const activeSiteId = useActiveSiteId()

type Tab = 'posts' | 'categories' | 'authors'
const tab = ref<Tab>('posts')

const statusFilter = ref('')
const search = ref('')
const error = ref('')
const busy = ref(false)

const { data: posts, refresh: refreshPosts } = await useAsyncData(
  () => `blog:posts:${activeSiteId.value}:${statusFilter.value}:${search.value}`,
  () =>
    activeSiteId.value
      ? api.get<BlogPostSummary[]>(`/api/v1/content/sites/${activeSiteId.value}/blog/posts`, {
          status: statusFilter.value || undefined,
          search: search.value.trim() || undefined,
        })
      : Promise.resolve([]),
  { watch: [activeSiteId, statusFilter, search], default: () => [] as BlogPostSummary[] },
)

const { data: categories, refresh: refreshCategories } = await useAsyncData(
  () => `blog:categories:${activeSiteId.value}`,
  () =>
    activeSiteId.value
      ? api.get<BlogCategory[]>(`/api/v1/content/sites/${activeSiteId.value}/blog/categories`)
      : Promise.resolve([]),
  { watch: [activeSiteId], default: () => [] as BlogCategory[] },
)

const { data: authors, refresh: refreshAuthors } = await useAsyncData(
  () => `blog:authors:${activeSiteId.value}`,
  () =>
    activeSiteId.value
      ? api.get<BlogAuthor[]>(`/api/v1/content/sites/${activeSiteId.value}/blog/authors`)
      : Promise.resolve([]),
  { watch: [activeSiteId], default: () => [] as BlogAuthor[] },
)

// region Creating

const creating = ref(false)
const draftTitle = ref('')
const draftSlug = ref('')
const slugTouched = ref(false)

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

const suggestedSlug = computed(() => (slugTouched.value ? draftSlug.value : slugify(draftTitle.value)))

async function createPost() {
  error.value = ''
  busy.value = true
  try {
    const post = await api.post<BlogPost>(`/api/v1/content/sites/${activeSiteId.value}/blog/posts`, {
      title: draftTitle.value,
      slug: suggestedSlug.value,
    })
    creating.value = false
    draftTitle.value = ''
    draftSlug.value = ''
    slugTouched.value = false
    await refreshPosts()
    await openPost(post.id)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the post.'
  } finally {
    busy.value = false
  }
}

// endregion

// region Editing one post

const editing = ref<BlogPost | null>(null)
const revisions = ref<BlogPostRevision[]>([])
const blocks = ref<BlockMetadata[]>([])
const pickingCover = ref(false)
const scheduleAt = ref('')
const newBlockId = ref('')

async function openPost(postId: string) {
  error.value = ''
  editing.value = await api.get<BlogPost>(`/api/v1/content/blog/posts/${postId}`)
  scheduleAt.value = ''
  revisions.value = await api.get<BlogPostRevision[]>(`/api/v1/content/blog/posts/${postId}/revisions`)
  if (!blocks.value.length) {
    blocks.value = await api.get<BlockMetadata[]>('/api/v1/blocks')
  }
}

async function savePost(patch: Record<string, unknown>) {
  if (!editing.value) return
  error.value = ''
  busy.value = true
  try {
    editing.value = await api.patch<BlogPost>(`/api/v1/content/blog/posts/${editing.value.id}`, patch)
    await refreshPosts()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save the post.'
  } finally {
    busy.value = false
  }
}

function saveDetails() {
  if (!editing.value) return
  void savePost({
    title: editing.value.title,
    slug: editing.value.slug,
    excerpt: editing.value.excerpt,
    categoryId: editing.value.categoryId,
    authorId: editing.value.authorId,
    tags: editing.value.tags,
    seo: editing.value.seo,
  })
}

/**
 * Body editing works on section ids and props, never on generated markup
 * (ADR-0003). Adding a block sends the id alone — the server fills the block's
 * own defaults, which is why a new section renders immediately.
 */
function addSection() {
  if (!editing.value || !newBlockId.value) return
  const sections = [
    ...editing.value.sections,
    { id: `sec_${Math.random().toString(36).slice(2, 10)}`, block: newBlockId.value, props: {} },
  ]
  newBlockId.value = ''
  void savePost({ sections })
}

function removeSection(index: number) {
  if (!editing.value) return
  void savePost({ sections: editing.value.sections.filter((_, position) => position !== index) })
}

function moveSection(index: number, direction: -1 | 1) {
  if (!editing.value) return
  const sections = [...editing.value.sections]
  const target = index + direction
  if (target < 0 || target >= sections.length) return
  ;[sections[index], sections[target]] = [sections[target]!, sections[index]!]
  void savePost({ sections })
}

function chooseCover(asset: MediaAsset) {
  void savePost({ coverMediaId: asset.id })
}

async function publish(scheduled: boolean) {
  if (!editing.value) return
  error.value = ''
  busy.value = true
  try {
    editing.value = await api.post<BlogPost>(`/api/v1/content/blog/posts/${editing.value.id}/publish`, {
      scheduledAt: scheduled && scheduleAt.value ? new Date(scheduleAt.value).toISOString() : null,
    })
    revisions.value = await api.get<BlogPostRevision[]>(
      `/api/v1/content/blog/posts/${editing.value.id}/revisions`,
    )
    await refreshPosts()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not publish the post.'
  } finally {
    busy.value = false
  }
}

async function unpublish() {
  if (!editing.value) return
  busy.value = true
  try {
    editing.value = await api.post<BlogPost>(`/api/v1/content/blog/posts/${editing.value.id}/unpublish`)
    await refreshPosts()
  } finally {
    busy.value = false
  }
}

async function restore(revisionId: string) {
  if (!editing.value) return
  busy.value = true
  try {
    editing.value = await api.post<BlogPost>(
      `/api/v1/content/blog/posts/${editing.value.id}/revisions/${revisionId}/restore`,
    )
    await refreshPosts()
  } finally {
    busy.value = false
  }
}

async function deletePost(postId: string) {
  busy.value = true
  try {
    await api.del(`/api/v1/content/blog/posts/${postId}`)
    editing.value = null
    await refreshPosts()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not delete the post.'
  } finally {
    busy.value = false
  }
}

// endregion

// region Taxonomy

const newCategoryName = ref('')
const newAuthorName = ref('')

async function addCategory() {
  if (!newCategoryName.value.trim()) return
  busy.value = true
  try {
    await api.post(`/api/v1/content/sites/${activeSiteId.value}/blog/categories`, {
      name: newCategoryName.value,
      slug: slugify(newCategoryName.value),
    })
    newCategoryName.value = ''
    await refreshCategories()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not add the category.'
  } finally {
    busy.value = false
  }
}

async function addAuthor() {
  if (!newAuthorName.value.trim()) return
  busy.value = true
  try {
    await api.post(`/api/v1/content/sites/${activeSiteId.value}/blog/authors`, {
      name: newAuthorName.value,
      slug: slugify(newAuthorName.value),
    })
    newAuthorName.value = ''
    await refreshAuthors()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not add the author.'
  } finally {
    busy.value = false
  }
}

// endregion

const STATUS_OPTIONS = [
  { label: 'All posts', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
]

const categoryOptions = computed(() => [
  { label: 'No category', value: '' },
  ...(categories.value ?? []).map((category) => ({ label: category.name, value: category.id })),
])

const authorOptions = computed(() => [
  { label: 'No author', value: '' },
  ...(authors.value ?? []).map((author) => ({ label: author.name, value: author.id })),
])

const blockOptions = computed(() => [
  { label: 'Add a block…', value: '' },
  ...blocks.value.map((block) => ({ label: `${block.name} · ${block.category}`, value: block.id })),
])

const scheduledCount = computed(() => (posts.value ?? []).filter((post) => post.status === 'scheduled').length)

const feedUrl = computed(() => `${config.public.coreApiUrl}/api/v1/content/public/blog/feed.xml`)

function when(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Blog"
      :description="`${posts?.length ?? 0} post(s)${scheduledCount ? ` · ${scheduledCount} scheduled` : ''}`"
    >
      <template #actions>
        <UiButton size="sm" :to="feedUrl" target="_blank" rel="noopener">RSS feed</UiButton>
        <UiButton v-if="can('page:write')" size="sm" variant="primary" @click="creating = true">New post</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <UiEmptyState
      v-if="!activeSiteId"
      title="No website selected"
      description="A blog belongs to a website. Create one first."
    >
      <UiButton variant="primary" to="/website/new?mode=ai">Make website with AI</UiButton>
    </UiEmptyState>

    <template v-else>
      <div class="mb-5 flex flex-wrap items-center gap-2">
        <div class="flex rounded-lg border border-line bg-raised p-0.5">
          <button
            v-for="option in (['posts', 'categories', 'authors'] as Tab[])"
            :key="option"
            type="button"
            class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors"
            :class="tab === option ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
            :aria-current="tab === option ? 'true' : undefined"
            @click="tab = option"
          >
            {{ option }}
          </button>
        </div>

        <template v-if="tab === 'posts'">
          <UiInput v-model="search" placeholder="Search posts" class="min-w-48 flex-1" />
          <UiSelect v-model="statusFilter" :options="STATUS_OPTIONS" class="w-40" />
        </template>
      </div>

      <!-- Posts -->
      <template v-if="tab === 'posts'">
        <UiEmptyState
          v-if="!posts?.length"
          title="No posts yet"
          description="A post is built from the same blocks as a page, so anything the editor can make, an article can be."
        >
          <UiButton v-if="can('page:write')" variant="primary" @click="creating = true">New post</UiButton>
        </UiEmptyState>

        <UiCard v-else :padded="false">
          <ul class="divide-y divide-line">
            <li
              v-for="post in posts"
              :key="post.id"
              class="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-sunken/60"
            >
              <img
                v-if="post.coverUrl"
                :src="`${config.public.coreApiUrl}${post.coverUrl}`"
                alt=""
                class="h-11 w-16 shrink-0 rounded-md border border-line bg-sunken object-cover"
              />
              <button type="button" class="min-w-0 flex-1 text-left" @click="openPost(post.id)">
                <p class="truncate text-sm font-medium text-ink">{{ post.title }}</p>
                <p class="truncate text-[0.8125rem] text-faint">
                  /blog/{{ post.slug }}
                  <template v-if="post.categoryName"> · {{ post.categoryName }}</template>
                  <template v-if="post.authorName"> · {{ post.authorName }}</template>
                  · {{ post.sectionCount }} section{{ post.sectionCount === 1 ? '' : 's' }}
                </p>
              </button>

              <div class="flex shrink-0 items-center gap-2">
                <span class="hidden text-[0.75rem] text-faint sm:inline">{{ when(post.publishedAt) }}</span>
                <UiBadge v-if="post.status === 'scheduled'" tone="brand">Scheduled</UiBadge>
                <UiBadge v-else-if="post.status === 'published' && !post.hasUnpublishedChanges" tone="positive">Live</UiBadge>
                <UiBadge v-else-if="post.status === 'published'" tone="warning">Edited</UiBadge>
                <UiBadge v-else>Draft</UiBadge>
                <UiButton size="sm" @click="openPost(post.id)">Edit</UiButton>
              </div>
            </li>
          </ul>
        </UiCard>
      </template>

      <!-- Categories -->
      <UiCard v-else-if="tab === 'categories'">
        <form class="mb-4 flex items-end gap-2" @submit.prevent="addCategory">
          <UiField v-slot="{ id }" label="New category" class="flex-1">
            <UiInput :id="id" v-model="newCategoryName" placeholder="Product updates" />
          </UiField>
          <UiButton type="submit" size="sm" variant="primary" :loading="busy">Add</UiButton>
        </form>

        <p v-if="!categories?.length" class="text-[0.8125rem] text-soft">No categories yet.</p>
        <ul v-else class="divide-y divide-line">
          <li v-for="category in categories" :key="category.id" class="flex items-center justify-between gap-3 py-2.5">
            <div class="min-w-0">
              <p class="truncate text-sm text-ink">{{ category.name }}</p>
              <p class="truncate text-[0.75rem] text-faint">/{{ category.slug }} · {{ category.postCount }} post(s)</p>
            </div>
            <UiButton
              v-if="can('page:write')"
              size="sm"
              variant="ghost"
              @click="api.del(`/api/v1/content/blog/categories/${category.id}`).then(() => refreshCategories())"
            >
              Remove
            </UiButton>
          </li>
        </ul>
      </UiCard>

      <!-- Authors -->
      <UiCard v-else>
        <form class="mb-4 flex items-end gap-2" @submit.prevent="addAuthor">
          <UiField v-slot="{ id }" label="New author" class="flex-1">
            <UiInput :id="id" v-model="newAuthorName" placeholder="Jane Doe" />
          </UiField>
          <UiButton type="submit" size="sm" variant="primary" :loading="busy">Add</UiButton>
        </form>

        <p v-if="!authors?.length" class="text-[0.8125rem] text-soft">No authors yet.</p>
        <ul v-else class="divide-y divide-line">
          <li v-for="author in authors" :key="author.id" class="flex items-center justify-between gap-3 py-2.5">
            <div class="min-w-0">
              <p class="truncate text-sm text-ink">{{ author.name }}</p>
              <p class="truncate text-[0.75rem] text-faint">/{{ author.slug }} · {{ author.postCount }} post(s)</p>
            </div>
            <UiButton
              v-if="can('page:write')"
              size="sm"
              variant="ghost"
              @click="api.del(`/api/v1/content/blog/authors/${author.id}`).then(() => refreshAuthors())"
            >
              Remove
            </UiButton>
          </li>
        </ul>
      </UiCard>
    </template>

    <!-- New post -->
    <UiDialog v-model:open="creating" title="New post">
      <form class="flex flex-col gap-4" @submit.prevent="createPost">
        <UiField v-slot="{ id }" label="Title" required>
          <UiInput :id="id" v-model="draftTitle" placeholder="How we cut load time in half" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Address" help="This becomes /blog/…">
          <UiInput
            :id="id"
            :model-value="suggestedSlug"
            :described-by="describedBy"
            @update:model-value="(value: string) => { slugTouched = true; draftSlug = value }"
          />
        </UiField>
      </form>
      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!draftTitle.trim()" @click="createPost">Create</UiButton>
      </template>
    </UiDialog>

    <!-- Edit post -->
    <UiDialog
      :open="Boolean(editing)"
      :title="editing?.title ?? ''"
      wide
      @update:open="(value: boolean) => { if (!value) editing = null }"
    >
      <div v-if="editing" class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField v-slot="{ id }" label="Title">
            <UiInput :id="id" v-model="editing.title" />
          </UiField>
          <UiField v-slot="{ id }" label="Address">
            <UiInput :id="id" v-model="editing.slug" />
          </UiField>
        </div>

        <UiField v-slot="{ id }" label="Excerpt" help="Shown in the archive and in the RSS feed.">
          <UiTextarea :id="id" v-model="editing.excerpt" :rows="2" />
        </UiField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiField v-slot="{ id }" label="Category">
            <UiSelect
              :id="id"
              :model-value="editing.categoryId ?? ''"
              :options="categoryOptions"
              @update:model-value="(value: string) => { if (editing) editing.categoryId = value || null }"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Author">
            <UiSelect
              :id="id"
              :model-value="editing.authorId ?? ''"
              :options="authorOptions"
              @update:model-value="(value: string) => { if (editing) editing.authorId = value || null }"
            />
          </UiField>
        </div>

        <div class="flex items-center gap-3">
          <img
            v-if="editing.coverUrl"
            :src="`${config.public.coreApiUrl}${editing.coverUrl}`"
            alt=""
            class="h-16 w-24 rounded-md border border-line bg-sunken object-cover"
          />
          <div>
            <p class="text-[0.8125rem] font-medium text-soft">Cover image</p>
            <div class="mt-1.5 flex gap-2">
              <UiButton size="sm" @click="pickingCover = true">{{ editing.coverUrl ? 'Change' : 'Choose' }}</UiButton>
              <UiButton v-if="editing.coverMediaId" size="sm" variant="ghost" @click="savePost({ coverMediaId: null })">
                Remove
              </UiButton>
            </div>
          </div>
        </div>

        <!-- Body -->
        <section>
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Body</h3>

          <ol v-if="editing.sections.length" class="mb-3 flex flex-col gap-1.5">
            <li
              v-for="(section, index) in editing.sections"
              :key="section.id"
              class="flex items-center gap-2 rounded-lg border border-line bg-sunken/50 px-3 py-2"
            >
              <span class="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">{{ section.block }}</span>
              <UiButton size="sm" variant="ghost" :disabled="index === 0" @click="moveSection(index, -1)">↑</UiButton>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="index === editing.sections.length - 1"
                @click="moveSection(index, 1)"
              >
                ↓
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="removeSection(index)">Remove</UiButton>
            </li>
          </ol>
          <p v-else class="mb-3 text-[0.8125rem] text-soft">
            No sections yet. Every block in the library works in a post exactly as it does on a page.
          </p>

          <div class="flex gap-2">
            <UiSelect v-model="newBlockId" :options="blockOptions" class="flex-1" />
            <UiButton size="sm" :disabled="!newBlockId" :loading="busy" @click="addSection">Add</UiButton>
          </div>
        </section>

        <!-- Publishing -->
        <section class="rounded-lg border border-line bg-sunken/40 p-4">
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Publishing</h3>
          <p class="mb-3 text-[0.8125rem] text-soft">
            <template v-if="editing.status === 'scheduled'">
              Goes live on {{ when(editing.publishedAt) }}. Until then it is not reachable, by anyone.
            </template>
            <template v-else-if="editing.status === 'published'">
              Live since {{ when(editing.publishedAt) }}.
              <template v-if="editing.hasUnpublishedChanges"> There are edits not yet published.</template>
            </template>
            <template v-else>Not published. Only you can see it.</template>
          </p>

          <div class="flex flex-wrap items-end gap-2">
            <UiField v-slot="{ id }" label="Schedule for">
              <input
                :id="id"
                v-model="scheduleAt"
                type="datetime-local"
                class="h-10 rounded-lg border border-line bg-raised px-3 text-sm text-ink"
              />
            </UiField>
            <UiButton v-if="can('page:publish')" size="sm" :disabled="!scheduleAt" :loading="busy" @click="publish(true)">
              Schedule
            </UiButton>
            <UiButton v-if="can('page:publish')" size="sm" variant="primary" :loading="busy" @click="publish(false)">
              Publish now
            </UiButton>
            <UiButton
              v-if="can('page:publish') && editing.status !== 'draft'"
              size="sm"
              :loading="busy"
              @click="unpublish"
            >
              Unpublish
            </UiButton>
          </div>
        </section>

        <section v-if="revisions.length">
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">History</h3>
          <ul class="flex flex-col gap-1">
            <li
              v-for="revision in revisions.slice(0, 8)"
              :key="revision.id"
              class="flex items-center justify-between gap-3 text-[0.8125rem]"
            >
              <span class="min-w-0 truncate text-soft">
                {{ when(revision.createdAt) }} · {{ revision.reason }} · {{ revision.sectionCount }} section(s)
              </span>
              <UiButton size="sm" variant="ghost" :loading="busy" @click="restore(revision.id)">Restore</UiButton>
            </li>
          </ul>
        </section>
      </div>

      <template #footer>
        <UiButton v-if="can('page:delete') && editing" variant="danger" size="sm" :loading="busy" @click="deletePost(editing.id)">
          Delete
        </UiButton>
        <UiButton size="sm" @click="editing = null">Close</UiButton>
        <UiButton size="sm" variant="primary" :loading="busy" @click="saveDetails">Save</UiButton>
      </template>
    </UiDialog>

    <MediaPicker v-model:open="pickingCover" title="Choose a cover image" folder="blog" @select="chooseCover" />
  </div>
</template>
