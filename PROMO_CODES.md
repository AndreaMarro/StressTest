# Promo Code System - User Guide

## Overview
Il sistema di codici promo permette agli utenti di accedere agli esami senza pagamento. Ogni codice è legato all'IP dell'utente che lo riscatta per la prima volta.

## Codici Disponibili (Demo)
I seguenti codici sono preconfigurati in `server/data/promo_codes.json`:

- **MED2025**: 100 utilizzi massimi
- **VIP_PASS**: 5 utilizzi massimi
- **TEST_DEV**: 999 utilizzi massimi (per testing)

## Come Funziona

### Per l'Utente
1. Apri il modal di pagamento
2. Clicca su "Hai un codice promo?"
3. Inserisci il codice (es. `MED2025`)
4. Clicca "APPLICA"
5. Se valido, accedi direttamente all'esame

### Sicurezza IP-Binding
- Il primo utilizzo di un codice lega l'IP dell'utente
- Lo stesso IP può riusare il codice infinite volte (idempotente)
- IP diversi NON possono usare lo stesso codice se ha raggiunto il limite di utilizzi
- Previene la condivisione indiscriminata dei codici

## Gestione Codici (Admin)

### Aggiungere un Nuovo Codice
Modifica `server/data/promo_codes.json`:

```json
{
  "code": "NUOVO_CODICE",
  "maxUses": 50,
  "usedBy": []
}
```

### Verificare Utilizzi
Il campo `usedBy` contiene la lista degli IP che hanno riscattato il codice:

```json
{
  "code": "MED2025",
  "maxUses": 100,
  "usedBy": ["192.168.1.1", "10.0.0.5"]
}
```

### Reset di un Codice
Per resettare un codice, svuota l'array `usedBy`:

```json
"usedBy": []
```

## API Endpoint

**POST** `/api/redeem-promo`

**Body:**
```json
{
  "code": "MED2025"
}
```

**Response (Success):**
```json
{
  "success": true,
  "sessionToken": "xxx-xxx-xxx",
  "expiresAt": "2025-11-24T17:00:00Z",
  "examId": "exam_id_123"
}
```

**Response (Error):**
```json
{
  "error": "Codice non valido"
}
```

## Errori Comuni

- **"Codice non valido"**: Il codice non esiste in `promo_codes.json`
- **"Codice esaurito"**: Il limite `maxUses` è stato raggiunto
- **"Errore di connessione"**: Problema di rete o server offline

## Note Tecniche

- Il file `server/data/promo_codes.json` è gitignored per sicurezza
- I codici sono case-insensitive (convertiti in UPPERCASE)
- La logica di accesso riusa `grantAccess()` esistente (45 min di validità)
