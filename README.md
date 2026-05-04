# Sistema de Registro Anestésico Digital (HUAP)

Esta é a aplicação móvel (focada em **Tablets Android**) para o **Registro Anestésico Digital** do **Hospital Universitário Antonio Pedro (HUAP / UFF)**. O objetivo principal do sistema é substituir as fichas de anestesia em papel, garantindo maior **segurança do paciente**, **precisão cronológica**, **rastreabilidade** e capacidade de **operação contínua offline**.

---

## 🛠️ Tecnologias Utilizadas

O frontend da aplicação foi desenvolvido utilizando as seguintes tecnologias:

- **Ionic (v7+) / Angular (v17+)**: Framework para desenvolvimento cross-platform (foco em Tablets).
- **TypeScript**: Programação fortemente tipada para robustez do código.
- **SASS / CSS3**: Estilização flexível e customizada, 100% fiel ao protótipo de design do sistema.
- **Reactive Forms**: Manipulação avançada de formulários e validações.
- **Local Storage / Session Storage**: Persistência de dados locais para suporte robusto ao modo offline.

---

## 📱 Funcionalidades Implementadas

### 1. Autenticação e Login
- **Componentização customizada**: Header institucional com logos da UFF e HUAP, inputs com ícones personalizados, status bar e componentes de carregamento.
- **Lógica e Facade (MVVM)**: Implementação de arquitetura clara com controle de estados (`loading`, `erro`, `sucesso`).
- **Validação de Campos**: Verificação de obrigatoriedade e restrição de entrada apenas de números no campo de CRM / CPF.
- **Manter conectado (Remember Me)**: Opção para salvar sessão localmente e carregar o último CRM digitado por padrão ao abrir o app.

### 2. Dashboard de Pacientes
- **Listagem de procedimentos**: Interface em grid contendo nome, prontuário, data de nascimento e sala de cirurgia do paciente.
- **Filtros e busca em tempo real**: Filtragem dinâmica por nome, número do prontuário ou procedimento, além de filtro por data e status ("Todos", "Em espera", "Realizados").

---

## 🚀 Como Rodar o Projeto Localmente

Certifique-se de ter o **Node.js** e o **Ionic CLI** instalados na sua máquina.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/GCAS-UFF/anesthesia-record.app.git
   ```

2. **Acesse a pasta do projeto:**
   ```bash
   cd anesthesia-record.app
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```
   *O projeto será aberto por padrão em `http://localhost:4200`.*

---

## 📂 Estrutura de Pastas

```text
src/
├── app/
│   ├── core/           # Serviços globais e modelos centrais (AuthService, etc.)
│   ├── features/       # Módulos e páginas principais (Login, Dashboard)
│   ├── shared/         # Componentes reutilizáveis (Headers, Botões, Inputs)
│   ├── tabs/           # Controle de rotas e navegação por abas
```

---

## 📄 Licença

Este projeto é de uso exclusivo e acadêmico da **Universidade Federal Fluminense (UFF)** e do **Hospital Universitário Antonio Pedro (HUAP)**.
