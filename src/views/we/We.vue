<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{ name: 'we' }">Мы</RouterLink>
      <RouterLink :to="{ name: 'we1' }">Глава 1</RouterLink>
      <RouterLink :to="{ name: 'we2' }">Глава 2</RouterLink>
      <RouterLink :to="{ name: 'we3' }">Глава 3</RouterLink>
      <RouterLink :to="{ name: 'we4' }">Глава 4</RouterLink>
      <RouterLink :to="{ name: 'we5' }">Глава 5</RouterLink>
      <RouterLink :to="{ name: 'we6' }">Глава 6</RouterLink>
      <RouterLink :to="{ name: 'we7' }">Глава 7</RouterLink>
      <RouterLink :to="{ name: 'we8' }">Глава 8</RouterLink>
      <RouterLink :to="{ name: 'we9' }">Глава 9</RouterLink>
      <RouterLink :to="{ name: 'we10' }">Глава 10</RouterLink>
      <RouterLink :to="{ name: 'we11' }">Глава 11</RouterLink>
      <RouterLink :to="{ name: 'we12' }">Глава 12</RouterLink>
      <RouterLink :to="{ name: 'we13' }">Глава 13</RouterLink>
      <RouterLink :to="{ name: 'we14' }">Глава 14</RouterLink>
      <RouterLink :to="{ name: 'we15' }">Глава 15</RouterLink>
      <RouterLink :to="{ name: 'we16' }">Глава 16</RouterLink>
      <RouterLink :to="{ name: 'we17' }">Глава 17</RouterLink>
      <RouterLink :to="{ name: 'we18' }">Глава 18</RouterLink>
      <RouterLink :to="{ name: 'we19' }">Глава 19</RouterLink>
      <RouterLink :to="{ name: 'we20' }">Глава 20</RouterLink>
      <RouterLink :to="{ name: 'we21' }">Глава 21</RouterLink>
      <RouterLink :to="{ name: 'we22' }">Глава 22</RouterLink>
      <RouterLink :to="{ name: 'we23' }">Глава 23</RouterLink>
      <RouterLink :to="{ name: 'we24' }">Глава 24</RouterLink>
      <RouterLink :to="{ name: 'we25' }">Глава 25</RouterLink>
      <RouterLink :to="{ name: 'we26' }">Глава 26</RouterLink>
      <RouterLink :to="{ name: 'we27' }">Глава 27</RouterLink>
      <RouterLink :to="{ name: 'we28' }">Глава 28</RouterLink>
      <RouterLink :to="{ name: 'we29' }">Глава 29</RouterLink>
      <RouterLink :to="{ name: 'we30' }">Глава 30</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
nav{
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
</style>