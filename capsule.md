## TODO 2022/01/06
- Doc le playground + link to capsule.nx.digital
- Décrire l'API de modeling
- Doc simplified (insert/update/delete/propose)
- Doc editable (edit on github link, md + gql)
- API modeling query (liste les classes/tables, listes les valeurs, types, description des champs d'une classe, lister l'héritage ou les prédécesseurs, faire un search sur une table ou champ)
- API modeling mutation (créer une classe)
- Audit (quand on accept/reject plusieur fois un instrument, on ne garde l'info que de la dernière résolution)

---

Arithméthique de base:
Hierarchie des notions:
1. valeur validée ou pas
2. valeur historisée // attention c'est l'historique des modifications date, pas de l'effective date.
3. multisource.
4. concepts de droits (on connait qui execute les calls, et on a moyen de savoir quel role il a)
5. transcription DB.
6. bitemporel valeur effective.

Notes: PAS DE CAPSULE DE CAPSULE.

Hiérarchie des risks:
1. Relation / Modeling (quelques objects avec l'ensemble des relations, figer une API graphql)
2. APIser le modeling (créer des nouveaux type d'objet) > créer des tables + link, faire attention aux droits
3. Notion de view, screen, logical model, physical model
4. Import en masse, performance, extract DH/DB

Hérarchie des points tech:
1. Auditable (timestamp et pas de suppression)
2. Permission
3. API Rest + GraphQL
4. Business Logic
5. Env de dev Business Rules (SQL/JS/JAVA...)
  > Faire du javascript
  > Voir en live les résultats + ajouter des tests cases
  > Lister les restrictions
- Dependency Graph
- Performance
- Recherche?
- Cube?
- Workflow/Cron?


# CAPSULE GERANT: MS + 4E + AUDIT.
// plusieurs sources avec une golden copy et une règle pour constituer la golden copy.
// Ce type de capsule wrap un point de donnée "statique". Pas une série temporelle complète. Cependant, la capsule peut wrapper un single point donné pour une série temporellle.
// audit de toutes les sources
// validation de toutes les sources.
// compute de la GC auto.

Source {
  BLOOMBERG
  REUTERS
  MANUAL
  GOLDEN
}

User {
  STEWARD
  ADMIN
}

Capsule {

  *private* dict<Source, list<DateTime, *A>> _value
  *private* dict<Source, list<DateTime, *A>> _candidate
  *private* dict<Source, list<DateTime, Status>> _status

  // manque la notion de clef ie de fund ID.

  capsule():
    _value = new dict()
    _candidate = new dict()
    _status = new dict()
    _value.push(GOLDEN, new list ())

  candidate(Source src):
    current_status = this._status[src].head().[1]
    return (current_status == PENDING) ? this._candidate[src].head()[1] : NULL

  status(Source src):
    return this._status[src].head().[1]

  value(Source src = GOLDEN):
    return this._value[src].head().[1]

  propose(Source src, A candidate):
    c = candidate.deep_copy() // question sur le fait qu'on ait besoin de faire une copie ici. je pense que oui, pour ne pas avoir une objet muté depuis l'extérieur.
    this._candidate[src].push((time.now(),*c))
    this._status[src].push((time.now(),PENDING))

  approve(User user, Source src):
    if authorized(user):
      this._value[src].push((time.now(),this.candidate(src)))
      this._status[src].push((time.now(),APPROVED))
      this.gild()

  *private* gild():
    gc = 0
    n = 0
    for s in sources:
      if this.value(s):
        gc += this.value(s)
        n +=1
    this._value[GOLDEN].push((time.now(),s))

  reject(Source src):
    this._status.push((time.now(),APPROVED))
}

main:
// Example

Capsule p = capsule("FR1234567")

french_candidate = {
  ISIN: FR1234567
  NAME:	EQUITY-DUMMY-1
  COUNTRY: France
  CCY: EUR
}

p.propose(french_candidate)
p.candidate()
p.approve()

italian_candidate = {
  ISIN: FR1234567
  NAME:	EQUITY-DUMMY-1
  COUNTRY: France
  CCY: EUR
}

p.propose(italian_candidate)
p.reject()
p.approve()

# DATA MODEL
Le data model est ultra simple, il s'agit d'une table unique qui track les évènements de création d'une capsule, de proposition d'un nouveau candidat et de changement de status.
- Table CAPSULE:
  - ID
  - MODIFICATION_DATE [DATETIME]
  - EVENT_TYPE [ENUM "VALUE"|"CANDIDATE"|"STATUS"]
  - SOURCE [ENUM SOURCE]
  - OBJECT_ID [ID]
- c = new Capsule(): crée une nouvelle ID dans la table.
Pour une capsule c donnée:
- c.candidate(SOURCE), fait un SELECT OBJECT_ID where EVENT_TYPE = CANDIDATE AND ID = c LAST DATETIME
- les call du type this._status[src].push sont des INSERT avec les valeurs adéquates.
- le c = candidate.deep_copy() signifie la duplication de l'objet; c'est peut être le plus tricky. Faut faire une copy complete de l'objet sous une nouvelle ID.

# Data
notes: dans le constructeur initialiser un nouvel objet ?
1. un objet "TEMP 1" a été populé par un processus hors de notre contrôle.
2. EXISTENCE DE LA CAPSULE ??
2. pour proposer l'objet "TEMP 1" comme candidat à la CAPSULE-FR123456:
  - on copy la ligne 1 de la table TEMP, dans la table CHARAC.
  - on crée une ligne dans la table CAPSULE signalant l'insertion d'un nouveau candidat.
  - on crée une ligne dans la table CAPSULE signalant le passage au status PENDING.
3. un utilisateur de type "ADMIN" récupère le dernier CANDIDAT pour le FUND_ID, et l'examine (select capsule where ISIN = XX & EVENT_TYPE = CANDIDATE, récupère le CHARAC_ID et va voir dans la table CHARAC)
4. il décide de l'approver:
- on insère une ligne dans la table CAPSULE pour déclarer le record CHARAC 3 comme la nouvelle "VALUE".
- on insère une ligne de status VALID dans la table CAPSULE.
5. un nouveau candidat avec la valeur country 'italy' arrive:
  - on crée une ligne dans la table CAPSULE signalant l'insertion d'un nouveau candidat.
  - on crée une ligne dans la table CAPSULE signalant le passage au status PENDING.
6. le candidat est rejeté:
- on crée une ligne dans la table CAPSULE signalant le passage au status VALID.
