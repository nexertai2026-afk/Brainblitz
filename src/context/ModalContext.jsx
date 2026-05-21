import { createContext, useContext, useState, useCallback } from 'react'

const ModalContext = createContext(null)

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) return { isOpen: false, openModal: () => {}, closeModal: () => {}, defaultTab: 'signin' }
  return ctx
}

export function ModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState('signin')

  const openModal = useCallback((tab = 'signin') => {
    setDefaultTab(tab)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <ModalContext.Provider value={{ isOpen, openModal, closeModal, defaultTab }}>
      {children}
    </ModalContext.Provider>
  )
}