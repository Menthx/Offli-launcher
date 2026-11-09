<script setup lang="ts">
import { computed } from 'vue'
import type { Game } from '../../../../shared/types'
import AppSelect from '../../components/AppSelect.vue'
import { PLATFORM_LABEL, baseGameName, kindLabel } from '../../format'
import { t } from '../../i18n'
import PathSpoiler from './PathSpoiler.vue'

/** Version picker, type, base ROM and hidden file path */
const props = defineProps<{ game: Game; target: Game }>()
const emit = defineEmits<{ pick: [versionId: string] }>()

const version = computed({
  get: () => props.target.id,
  set: (id: string) => emit('pick', id)
})
const versionOptions = computed(() =>
  (props.game.versions ?? []).map((v, i) => ({
    value: v.id,
    label: (v.variant ?? v.name) + (i === 0 ? t('detail.latest') : '')
  }))
)
</script>

<template>
  <section class="gp-box gp-info" aria-labelledby="info-title">
    <header class="gp-box__head">
      <h5 id="info-title">{{ t('detail.info') }}</h5>
    </header>
    <dl class="facts">
      <template v-if="game.versions">
        <dt>
          <label for="version-select">{{ t('detail.version') }}</label>
        </dt>
        <dd>
          <AppSelect id="version-select" v-model="version" class="select--sm" :options="versionOptions" />
        </dd>
      </template>
      <dt>{{ t('detail.type') }}</dt>
      <dd>{{ kindLabel(game) }} · {{ PLATFORM_LABEL[game.platform] }}</dd>
      <template v-if="game.kind !== 'fangame'">
        <dt>{{ t('detail.base') }}</dt>
        <dd>{{ game.baseRom ? `${baseGameName(game.baseRom)} (${game.baseRom.code})` : t('detail.unknownBase') }}</dd>
      </template>
      <!-- Last: the revealed path may wrap without moving anything below -->
      <dt>{{ t('detail.file') }}</dt>
      <dd><PathSpoiler :key="target.id" :path="target.path" /></dd>
    </dl>
  </section>
</template>
