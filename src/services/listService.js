import { db } from '../db/db'

export async function getLists() {
  try {
    return await db.lists.toArray()
  } catch (err) {
    console.error('listService.getLists failed:', err)
    return []
  }
}

export async function createList(name) {
  try {
    const trimmed = name.trim()
    if (!trimmed) return null
    const newList = {
      id: `list-${Date.now()}`,
      name: trimmed,
      system: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.lists.add(newList)
    return newList
  } catch (err) {
    console.error('listService.createList failed:', err)
    throw err
  }
}

export async function renameList(id, newName) {
  try {
    const trimmed = newName.trim()
    if (!trimmed) return
    await db.lists.update(id, { name: trimmed, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('listService.renameList failed:', err)
    throw err
  }
}

export async function deleteList(id) {
  try {
    const target = await db.lists.get(id)
    if (!target || target.system) return

    // Reassign tasks in this list safely to default 'tasks' list
    const listTasks = await db.tasks.where('listId').equals(id).toArray()
    for (const t of listTasks) {
      await db.tasks.update(t.id, { listId: 'tasks', updatedAt: new Date().toISOString() })
    }

    await db.lists.delete(id)
  } catch (err) {
    console.error('listService.deleteList failed:', err)
    throw err
  }
}
