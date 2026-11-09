<script setup lang="ts">
import { computed, ref } from 'vue'
import { isIconImage } from '../../../../shared/linkIcons'
import { linkKind } from '../../../../shared/links'
import type { DetectedLink, GameJournal } from '../../../../shared/types'
import Icon from '../../components/Icon.vue'
import { t } from '../../i18n'
import { ICONS, type LinkRow, linkRows, removeLink, replaceLink, shortUrl, toLink } from './communityLinks'
import LinkForm from './LinkForm.vue'

/** Creator's Discord, game channel, wiki: added by the player, or found in offli.md and the game's text files */
const props = defineProps<{ journal: GameJournal | undefined; detected: DetectedLink[] }>()
const emit = defineEmits<{ save: [next: GameJournal] }>()

// 'new', or the URL of the link being edited
const editing = ref<string>()
const rows = computed(() => linkRows(props.journal, props.detected))
const labelOf = (row: LinkRow): string => row.name ?? t(`journal.${linkKind(row.url)}`)
const isImage = (row: LinkRow): boolean => !!row.chosen && isIconImage(row.chosen)
const open = (url: string): void => void window.offli.openLink(url)

const remove = (row: LinkRow): void => {
  if (props.journal) emit('save', removeLink(props.journal, row))
}
const edited = (row: LinkRow, url: string, name: string): void => {
  editing.value = undefined
  if (props.journal) emit('save', replaceLink(props.journal, row, toLink(url, name, row.chosen)))
}
const added = (url: string, name: string): void => {
  editing.value = undefined
  const j = props.journal
  if (j && !j.links.some((l) => l.url === url)) emit('save', { ...j, links: [...j.links, toLink(url, name)] })
}
</script>

<template>
  <section class="gp-box community" aria-labelledby="community-title">
    <header class="gp-box__head">
      <h5 id="community-title">{{ t('journal.community') }}</h5>
    </header>
    <p v-if="journal && rows.length === 0 && !editing" class="muted">{{ t('journal.noLinks') }}</p>
    <ul v-if="rows.length > 0" class="links">
      <template v-for="row in rows" :key="row.url">
        <li v-if="editing === row.url">
          <LinkForm
            :initial="{ url: row.url, label: row.name ?? '' }"
            @close="editing = undefined"
            @submit="(url, name) => edited(row, url, name)"
          />
        </li>
        <li v-else :class="['com-link', `com-link--${isImage(row) ? 'image' : row.icon}`]">
          <button class="link__open" @click="open(row.url)">
            <span class="link__icon">
              <img v-if="isImage(row)" :src="row.chosen" alt="" draggable="false" />
              <Icon v-else :name="ICONS[row.icon]" :size="18" />
            </span>
            <span class="link__text">
              <span class="link__label">{{ labelOf(row) }}</span>
              <small>{{ row.file ? t('journal.foundIn', { file: row.file }) : shortUrl(row.url) }}</small>
            </span>
            <Icon name="external" :size="14" />
          </button>
          <span class="link__tools">
            <button
              class="icon-btn"
              :aria-label="t('journal.editLink', { name: labelOf(row) })"
              @click="editing = row.url"
            >
              <Icon name="pencil" :size="14" />
            </button>
            <button class="icon-btn" :aria-label="t('journal.removeLink', { name: labelOf(row) })" @click="remove(row)">
              <Icon name="close" :size="14" />
            </button>
          </span>
        </li>
      </template>
    </ul>
    <LinkForm v-if="editing === 'new'" @close="editing = undefined" @submit="added" />
    <button v-else class="text-btn" :disabled="!journal" @click="editing = 'new'">
      <Icon name="plus" :size="14" />
      {{ t('journal.addLink') }}
    </button>
  </section>
</template>
